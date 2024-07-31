const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//register user

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const registerUserQuery = `SELECT * FROM user WHERE username='${username}';`
  const hashedPassword = await bcrypt.hash(password, 10)
  const dbUser = await db.get(registerUserQuery)
  if (dbUser === undefined && password.length >= 5) {
    const InsertUserQuery = `INSERT INTO user(username,name,password,gender,location) 
    VALUES(
     '${username}',
     '${name}',
     '${hashedPassword}',
     '${gender}',
     '${location}'
    );
    `
    await db.run(InsertUserQuery)
    response.status(200)
    response.send('User created successfully')
  } else if (dbUser === undefined && password.length < 5) {
    response.status(400)
    response.send('Password is too short')
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//login user
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const loginUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const dbUser = await db.get(loginUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password)
    if (isPasswordCorrect) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//change user password

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const checkUser = `SELECT * FROM user WHERE username='${username}';`
  const dbUser = await db.get(checkUser)
  const checkPassword = await bcrypt.compare(oldPassword, dbUser.password)
  if (checkPassword) {
    if (newPassword.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPasswordNew = await bcrypt.hash(newPassword, 10)
      const updateQuery = `UPDATE user SET password='${hashedPasswordNew}' WHERE username='${username}'`
      await db.run(updateQuery)
      response.send('Password updated')
    }
  } else {
    response.status(400)
    response.send('Invalid current password')
  }
})

module.exports = app
