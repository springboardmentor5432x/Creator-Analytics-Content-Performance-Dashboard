"""CreatorHub API: real YouTube OAuth/analytics integration + honest unconnected states.
Provider credentials belong in backend/.env, never in the React bundle.
"""
import os, json, secrets, sqlite3
from datetime import datetime, timezone, date, timedelta
from urllib.parse import urlencode
import requests
from flask import Flask, jsonify, request, redirect, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'development-only-change-this-secret')
CORS(app, origins=os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173'), supports_credentials=True)
DB_PATH = os.getenv('TOKEN_DB_PATH', os.path.join(os.path.dirname(__file__), 'creatorhub_tokens.sqlite3'))
GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'
ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2/reports'
YT_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly']

def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute('''CREATE TABLE IF NOT EXISTS social_tokens (
        email TEXT NOT NULL, provider TEXT NOT NULL, access_token TEXT NOT NULL,
        refresh_token TEXT, expires_at INTEGER, updated_at TEXT NOT NULL,
        PRIMARY KEY(email, provider))''')
    con.commit()
    return con

def now_iso(): return datetime.now(timezone.utc).isoformat()
def credentials_ready(): return bool(os.getenv('GOOGLE_CLIENT_ID') and os.getenv('GOOGLE_CLIENT_SECRET'))
def callback_url(): return os.getenv('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:5000/api/oauth/youtube/callback')

def token_for(email):
    with db() as con:
        row = con.execute('SELECT * FROM social_tokens WHERE email=? AND provider=?', (email, 'youtube')).fetchone()
    if not row: return None
    token = dict(row)
    if token.get('expires_at') and token['expires_at'] < int(datetime.now(timezone.utc).timestamp()) + 60:
        if not token.get('refresh_token'): return None
        resp = requests.post(GOOGLE_TOKEN, data={'client_id':os.getenv('GOOGLE_CLIENT_ID'),'client_secret':os.getenv('GOOGLE_CLIENT_SECRET'),'refresh_token':token['refresh_token'],'grant_type':'refresh_token'}, timeout=20)
        if not resp.ok: return None
        new = resp.json(); expires = int(datetime.now(timezone.utc).timestamp()) + int(new.get('expires_in', 3600))
        with db() as con:
            con.execute('UPDATE social_tokens SET access_token=?, expires_at=?, updated_at=? WHERE email=? AND provider=?', (new['access_token'], expires, now_iso(), email, 'youtube'))
        token['access_token'] = new['access_token']
    return token

def google_get(url, token, params=None):
    r = requests.get(url, headers={'Authorization':f"Bearer {token}"}, params=params, timeout=25)
    if not r.ok: raise RuntimeError(f'YouTube API returned {r.status_code}: {r.text[:300]}')
    return r.json()

@app.get('/api/health')
def health():
    return jsonify(status='ok', service='creatorhub-analytics-api', timestamp=now_iso(), youtube_oauth_configured=credentials_ready())

@app.get('/api/oauth/youtube/start')
def youtube_start():
    email = request.args.get('email','').strip().lower()
    if not email: return jsonify(error='Signed-in email is required.'), 400
    if not credentials_ready(): return jsonify(error='YouTube OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.'), 503
    state = secrets.token_urlsafe(32)
    session['youtube_oauth_state'] = state
    session['youtube_oauth_email'] = email
    params = {'client_id':os.getenv('GOOGLE_CLIENT_ID'),'redirect_uri':callback_url(),'response_type':'code','scope':' '.join(YT_SCOPES),'access_type':'offline','include_granted_scopes':'true','prompt':'consent','state':state}
    return redirect(GOOGLE_AUTH + '?' + urlencode(params))

@app.get('/api/oauth/youtube/callback')
def youtube_callback():
    if request.args.get('error'): return f"YouTube authorization failed: {request.args.get('error')}", 400
    if not session.get('youtube_oauth_state') or request.args.get('state') != session.get('youtube_oauth_state'):
        return 'OAuth state mismatch. Please return to CreatorHub and try connecting again.', 400
    email = session.pop('youtube_oauth_email', None); session.pop('youtube_oauth_state', None)
    if not email or not request.args.get('code'): return 'Missing account or authorization code.', 400
    r = requests.post(GOOGLE_TOKEN, data={'code':request.args['code'],'client_id':os.getenv('GOOGLE_CLIENT_ID'),'client_secret':os.getenv('GOOGLE_CLIENT_SECRET'),'redirect_uri':callback_url(),'grant_type':'authorization_code'}, timeout=25)
    if not r.ok: return f'Could not exchange YouTube authorization code: {r.text[:300]}', 400
    data = r.json(); expires = int(datetime.now(timezone.utc).timestamp()) + int(data.get('expires_in',3600))
    with db() as con:
        old = con.execute('SELECT refresh_token FROM social_tokens WHERE email=? AND provider=?',(email,'youtube')).fetchone()
        refresh = data.get('refresh_token') or (old['refresh_token'] if old else None)
        con.execute('''INSERT INTO social_tokens(email,provider,access_token,refresh_token,expires_at,updated_at) VALUES(?,?,?,?,?,?)
        ON CONFLICT(email,provider) DO UPDATE SET access_token=excluded.access_token, refresh_token=excluded.refresh_token, expires_at=excluded.expires_at, updated_at=excluded.updated_at''', (email,'youtube',data['access_token'],refresh,expires,now_iso()))
    return redirect(os.getenv('FRONTEND_ORIGIN','http://localhost:5173') + '/?youtube=connected')

@app.get('/api/social-accounts')
def social_accounts():
    email=request.args.get('email','').strip().lower()
    if not email: return jsonify(error='email query parameter is required'),400
    yt=token_for(email)
    return jsonify(accounts=[{'provider':'YouTube','connected':bool(yt),'updatedAt':yt.get('updated_at') if yt else None}, {'provider':'Instagram','connected':False,'requires':'Meta app credentials and eligible Instagram professional account'}, {'provider':'TikTok','connected':False,'requires':'TikTok app credentials and approved scopes'}], checkedAt=now_iso())

@app.get('/api/analytics/overview')
def analytics_overview():
    email=request.args.get('email','').strip().lower()
    if not email: return jsonify(error='email query parameter is required'),400
    token=token_for(email)
    if not token:
        return jsonify(connected=False,mode='unconnected',message=('YouTube OAuth is not configured.' if not credentials_ready() else 'No YouTube account is authorized for this user. Open Social Accounts and connect YouTube.'),platforms=[],metrics=None,posts=[],growth=[],weekly=[],checkedAt=now_iso())
    access=token['access_token']
    try:
        channel_data=google_get(YOUTUBE_API+'/channels',access,{'part':'snippet,statistics,contentDetails','mine':'true','maxResults':1})
        channels=channel_data.get('items',[])
        if not channels: return jsonify(connected=False,mode='unconnected',message='The authorized Google account has no accessible YouTube channel.',platforms=[],metrics=None,posts=[],growth=[],weekly=[],checkedAt=now_iso())
        channel=channels[0]; stats=channel.get('statistics',{}); uploads=channel.get('contentDetails',{}).get('relatedPlaylists',{}).get('uploads')
        videos=[]
        if uploads:
            playlist=google_get(YOUTUBE_API+'/playlistItems',access,{'part':'snippet,contentDetails','playlistId':uploads,'maxResults':10})
            ids=[x.get('contentDetails',{}).get('videoId') for x in playlist.get('items',[]) if x.get('contentDetails',{}).get('videoId')]
            if ids:
                vd=google_get(YOUTUBE_API+'/videos',access,{'part':'snippet,statistics','id':','.join(ids)})
                for v in vd.get('items',[]):
                    vs=v.get('statistics',{}); views=int(vs.get('viewCount',0)); likes=int(vs.get('likeCount',0)); comments=int(vs.get('commentCount',0))
                    videos.append({'title':v.get('snippet',{}).get('title','Untitled video'),'type':'Video','platform':'▶','platformName':'YouTube','views':f'{views:,}','likes':f'{likes:,}','comments':f'{comments:,}','engagement':'—','date':v.get('snippet',{}).get('publishedAt','')[:10],'image': '▶'})
        # Subscriber and public channel totals are genuine YouTube Data API fields.
        # Per-period views/likes/comments are queried separately; if unavailable, show unavailable rather than inventing values.
        start=(date.today()-timedelta(days=30)).isoformat(); end=(date.today()-timedelta(days=1)).isoformat()
        report=None; report_error=None
        try:
            report=google_get(ANALYTICS_API,access,{'ids':'channel==MINE','startDate':start,'endDate':end,'metrics':'views,likes,comments,shares','dimensions':'day','sort':'day'})
        except Exception as ex: report_error=str(ex)
        rows=(report or {}).get('rows',[])
        total_views=sum(int(row[1] or 0) for row in rows); total_likes=sum(int(row[2] or 0) for row in rows); total_comments=sum(int(row[3] or 0) for row in rows); total_shares=sum(int(row[4] or 0) for row in rows)
        metrics=[
          {'label':'Subscribers','value':f"{int(stats.get('subscriberCount',0)):,}" if 'subscriberCount' in stats else 'Hidden','change':'—','icon':'users','tone':'violet','note':'YouTube channel total'},
          {'label':'Channel Views','value':f"{int(stats.get('viewCount',0)):,}",'change':'—','icon':'eye','tone':'blue','note':'Public channel total'},
          {'label':'Views (30 days)','value':f'{total_views:,}' if report is not None else 'Unavailable','change':'—','icon':'heart','tone':'rose','note':'YouTube Analytics API'},
          {'label':'Likes (30 days)','value':f'{total_likes:,}' if report is not None else 'Unavailable','change':'—','icon':'message','tone':'cyan','note':'YouTube Analytics API'},
          {'label':'Comments (30 days)','value':f'{total_comments:,}' if report is not None else 'Unavailable','change':'—','icon':'share','tone':'purple','note':'YouTube Analytics API'},
          {'label':'Videos Published','value':f"{int(stats.get('videoCount',0)):,}",'change':'—','icon':'crown','tone':'amber','note':'Public channel total'}]
        growth=[{'date':row[0][5:],'youtube':int(row[1] or 0)} for row in rows] if rows else []
        weekly=[]
        for row in rows[-7:]: weekly.append({'day':row[0][5:],'views':int(row[1] or 0)})
        return jsonify(connected=True,mode='live',message='Live YouTube API data. Only authorized and available metrics are shown.',platforms=['YouTube'],channel={'title':channel.get('snippet',{}).get('title')},metrics=metrics,posts=videos,growth=growth,weekly=weekly,analyticsAvailable=report is not None,analyticsWarning=report_error,checkedAt=now_iso())
    except Exception as ex:
        app.logger.exception('YouTube analytics fetch failed')
        return jsonify(connected=False,mode='error',message='YouTube is authorized, but fetching data failed. Check API access, scopes, and backend logs.',detail=str(ex)[:300],platforms=['YouTube'],metrics=None,posts=[],growth=[],weekly=[],checkedAt=now_iso()),502

if __name__ == '__main__':
    app.run(host='127.0.0.1',port=int(os.getenv('PORT','5000')),debug=os.getenv('FLASK_DEBUG','false').lower()=='true')
