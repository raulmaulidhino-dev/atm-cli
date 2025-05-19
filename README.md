# ATM CLI 💲🏧

ATM CLI is a simple and interactive ATM (Automated Teller Machine) CLI-based app created with [Commander.js](https://www.npmjs.com/package/commander) library. It uses [MySQL](https://www.mysql.com) as a local running database. 


## 🏁 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

The things you need before cloning the app.

* [MySQL 8.0](https://www.mysql.com) installed
* [Git](https://git-scm.com/downloads) installed (optional but recommended)
* Your favorite Code Editor app! (VSCode, Sublime, etc.)

### Installation

A step by step guide that will tell you how to get the development environment up and running.

Using Git

```
git clone https://github.com/raulmaulidhino-dev/atm-cli.git
cd atm-cli
npm install
```

Or you can also install the zip file and unzip it after installation. Open the `atm-cli` folder and run

```
npm install
```

## 🛠️ MySQL Setup Instructions
### 1. Log in to MySQL
Use the following command to log in to your MySQL server:

```bash
mysql -u your_username -p
```
Replace `your_username` with your MySQL username (e.g., `root`).

You will be prompted to enter your MySQL password.

### 2. Create a New Database
Once logged in, run the following SQL command to create a new database:

```sql
CREATE DATABASE your_database_name;
```

Replace `your_database_name` with the name you want for your database (e.g., `atm_db`).

You can then select it:

```sql
USE your_database_name;
```

### 3. Import the Schema
Import the `model/atm_db.sql` database schema file from the terminal (exit MySQL first):

```bash
mysql -u your_username -p your_database_name < model/atm_db.sql
```

### 4. Create a `.env` file and Set it Up!
You can rename the `.env.example` file into `.env` and replace the content inside based on your MySQL server data
```env
DB_HOST="localhost"
DB_USER="your_username"
DB_PASSWORD="your_password"
DB_NAME="your_database_name"
```

### 💡 Tips
- Make sure MySQL is installed and running on your machine.
- If you face permission issues, try running the command with `sudo` (on Unix-based systems).


## ⚡ Quick Usage
### 1. Register a new account
```bash
node atm register -n <name> -p
```
e.g.
```bash
node atm register -n john -p
```
You will be prompted to enter your PIN.



### 2. Login into an account
```bash
node atm login -n <name> -p
```
e.g.
```bash
node atm login -n john -p
```
You will be prompted to enter your PIN.



### 3. Check account balance
```bash
node atm check-balance
```


### 4. Deposit money
```bash
node atm deposit <amount>
```
e.g.
```bash
node atm deposit 61.74
```


### 5. Withdraw from the deposit balance (number cannot be negative)
```bash
node atm withdraw <amount>
```
e.g.
```bash
node atm withdraw 11.42
```

### 6. Transfer money to another registered account by id
```bash
node atm transfer <amount> -t <target_account_id>
```
e.g.
```bash
node atm transfer 10 -t 2
```
### 🗒️ Notes
- After logging in, account session will be saved inside `session/session.json`, forever! Until you remove it manually~
- `check-balance`, `deposit`, `withdraw`, `transfer` only work if the current login session in `session/session.json` exists
- To learn and explore more about the commands and flags, run this command:
```bash
node atm -h
```

--


Made with ❤️ in Indonesia 🇮🇩


MIT © [Raul Maulidhino](https://rauldev.my.id)
