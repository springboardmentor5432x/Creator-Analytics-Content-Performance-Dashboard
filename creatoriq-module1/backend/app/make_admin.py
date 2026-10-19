import sqlite3

c = sqlite3.connect("creatoriq.db")
c.execute("UPDATE users SET role = 'admin' WHERE email = 'adminmain1@gmail.com'")
c.commit()
print(c.execute("SELECT email, role FROM users").fetchall())
c.close()