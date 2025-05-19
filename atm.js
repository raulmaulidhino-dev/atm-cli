import db from './model/db.js';
import { Command } from 'commander';
import inquirer from 'inquirer';
import bcrypt from 'bcrypt';

import { saveSession, getSession } from './session/session.js';

const program = new Command();

program.name('atm').description('CLI-based virtual ATM').version('1.0.0');

let failedLoginAttempts = 0;

/* Testing Commands */

program
  .command('test')
  .description('Say "Hello World!"')
  .action(async () => {
    console.log('Hello World!');
  });

program
  .command('test-db')
  .description('Test MySQL Connection')
  .action(async () => {
    try {
      await db.execute('SELECT 1 + 1 AS result');
      console.log('Connection successful!');
    } catch (err) {
      console.error('Connection failed:', err.message);
    } finally {
      await db.end();
    }
  });

/* Main ATM CLI Commands */

// Register
program
  .command('register')
  .description('Register a new account')
  .requiredOption('-n, --name <name>', 'Name (required)')
  .option('-p, --pin', 'PIN [6-digit numeric strings] (required)')
  .action(async (options) => {
    try {
      let pin = null;
      if (options.pin) {
        await inquirer
          .prompt([
            {
              type: 'password',
              name: 'password',
              message: 'Enter PIN:',
              mask: '*',
            },
          ])
          .then((answers) => {
            pin = answers.password;
          });
      } else {
        throw Error('PIN is required to register a new account!');
      }
      // Check PIN format
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        throw Error('PIN should be exactly a 6-digit numeric string.');
      }

      // Hash PIN
      const hashedPIN = await bcrypt.hash(String(pin), 10);

      // Register a new account
      await db.execute(
        `INSERT INTO accounts (name, pin, balance) VALUES (?, ?, ?)`,
        [options.name, hashedPIN, 0.0]
      );

      // Output success message
      console.info('Your new account was created successfully!');
    } catch (err) {
      console.error(`Register Error:`, err.message);
    } finally {
      await db.end();
    }
  });

// Login
program
  .command('login')
  .description('Login into your account')
  .requiredOption('-n, --name <name>', 'Name (required)')
  .option('-p, --pin', 'PIN [6-digit numeric strings] (required)')
  .action(async (options) => {
    // Check failed login attempts
    if (failedLoginAttempts >= 3) {
      console.error(
        'Account locked due to multiple failed login attempts. Please try again later.'
      );
      return;
    }

    try {
      let pin = null;
      if (options.pin) {
        await inquirer
          .prompt([
            {
              type: 'password',
              name: 'password',
              message: 'Enter PIN:',
              mask: '*',
            },
          ])
          .then((answers) => {
            pin = answers.password;
          });
      } else {
        throw Error('PIN is required to log in into your account!');
      }
      // Get account data
      const [accounts] = await db.execute(
        `SELECT id, name, pin, balance FROM accounts WHERE name = ?`,
        [options.name]
      );

      if (accounts.length < 1) {
        failedLoginAttempts++;
        throw Error('Invalid name or PIN');
      }

      // Match PIN
      const match = bcrypt.compare(pin, accounts[0].pin);

      if (!match) {
        failedLoginAttempts++;
        throw Error('Invalid name or PIN');
      }

      // Destructure account data
      const { id, name, balance } = accounts[0];

      failedLoginAttempts = 0;

      // Save session
      await saveSession({ id, name });

      // Output success message
      console.table([{ id, name, balance: Number(balance) }]);
      console.info('Login successful!');
    } catch (err) {
      console.error('Login Error:', err.message);
    } finally {
      await db.end();
    }
  });

// Check Balance
program
  .command('check-balance')
  .description('Check your current balance')
  .action(async () => {
    try {
      // Get account session
      const session = await getSession();
      if (!session) {
        throw Error('You are not logged in yet!');
      }

      // Get account data
      const [accounts] = await db.execute(
        `SELECT id, name, balance FROM accounts WHERE id = ?`,
        [session.id]
      );

      // Destructure account data
      const { id, name, balance } = accounts[0];

      // Output
      console.table([{ id, name, balance: Number(balance) }]);
    } catch (err) {
      console.error('Check Balance Error:', err.message);
    } finally {
      await db.end();
    }
  });

// Deposit
program
  .command('deposit <amount>')
  .description('Put money into your account')
  .action(async (amount) => {
    try {
      const amountNum = Number(amount);
      // Get account session
      const session = await getSession();
      if (!session) {
        throw Error('Transaction declined. You are not logged in yet!');
      }

      // Check amount format
      if (isNaN(amountNum) || amountNum <= 0) {
        throw Error(
          'Invalid money input format. Please enter a positive number.'
        );
      }

      // Get account data
      const [accounts] = await db.execute(
        `SELECT id, balance FROM accounts WHERE id = ?`,
        [session.id]
      );

      // Destructure account data
      const { id: account_id, balance } = accounts[0];

      // Declare a new balance
      let newBalance = Number(balance) + amountNum;

      // Update account balance
      await db.execute(`UPDATE accounts SET balance = ? WHERE id = ?`, [
        newBalance,
        session.id,
      ]);

      // Create and get the transaction details
      const [result] = await db.execute(
        `INSERT INTO transactions (account_id, type, amount) VALUES (?, ?, ?)`,
        [account_id, 'deposit', amount]
      );
      const [transactions] = await db.execute(
        `SELECT id, type, amount, created_at FROM transactions WHERE id = ?`,
        [result.insertId]
      );

      // Output
      const {
        id,
        type,
        amount: transaction_amount,
        created_at,
      } = transactions[0];

      console.table([
        {
          transaction_id: id,
          type,
          amount: Number(transaction_amount),
          created_at,
        },
      ]);
      console.info('Your money was added successfully!');
    } catch (err) {
      console.error('Deposit Error:', err.message);
    } finally {
      await db.end();
    }
  });

// Withdraw
program
  .command('withdraw <amount>')
  .description('Take money out of your account')
  .action(async (amount) => {
    try {
      const amountNum = Number(amount);

      // Get account session
      const session = await getSession();
      if (!session)
        throw Error('Transaction declined. You are not logged in yet!');

      // Check amount format
      if (isNaN(amountNum) || amountNum <= 0) {
        throw Error(
          'Invalid money input format. Please enter a positive number.'
        );
      }

      // Get account data
      const [accounts] = await db.execute(
        `SELECT id, name, balance FROM accounts WHERE id = ?`,
        [session.id]
      );

      // Destructure account data
      const { id: account_id, name, balance } = accounts[0];

      // Check amount and balance
      if (amountNum > Number(balance)) {
        throw Error('Transaction declined. Not enough balance.');
      }

      // Declare a new balance
      let newBalance = Number(balance) - amountNum;

      // Update account balance
      await db.execute(`UPDATE accounts SET balance = ? WHERE name = ?`, [
        newBalance,
        name,
      ]);

      // Create and get the transaction details
      const [result] = await db.execute(
        `INSERT INTO transactions (account_id, type, amount) VALUES (?, ?, ?)`,
        [account_id, 'withdraw', amount]
      );

      const [transactions] = await db.execute(
        `SELECT id, type, amount, created_at FROM transactions WHERE id = ?`,
        [result.insertId]
      );

      // Output
      const {
        id,
        type,
        amount: transaction_amount,
        created_at,
      } = transactions[0];

      console.table([
        {
          transaction_id: id,
          type,
          amount: Number(transaction_amount),
          created_at,
        },
      ]);
      console.info('Your money was taken out successfully!');
    } catch (err) {
      console.error('Withdraw Error:', err.message);
    } finally {
      await db.end();
    }
  });

// Transfer
program
  .command('transfer <amount>')
  .description('Transfer amount of money into an account by id')
  .requiredOption('-t, --to <target_account_id>', 'Target account id')
  .action(async (amount, options) => {
    try {
      const session = await getSession();
      if (!session) {
        throw Error('Transaction declined. You are not logged in yet!');
      }

      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw Error(
          'Invalid money input format. Please enter a positive number.'
        );
      }

      const [targetAccounts] = await db.execute(
        `SELECT id, name, balance FROM accounts WHERE id = ?`,
        [options.to]
      );

      if (targetAccounts.length < 1) {
        throw Error("The target account with that id doesn't exist!");
      }

      const {
        id: target_account_id,
        name: target_account_name,
        balance: target_account_balance,
      } = targetAccounts[0];

      const [accounts] = await db.execute(
        `SELECT id, name, balance FROM accounts WHERE id = ?`,
        [session.id]
      );

      const {
        id: account_id,
        name: account_name,
        balance: account_balance,
      } = accounts[0];

      if (amountNum > Number(account_balance)) {
        throw Error('Transaction declined. Not enough balance.');
      }

      const newSenderBalance = Number(account_balance) - amountNum;
      const newReceiverBalance = Number(target_account_balance) + amountNum;

      await db.execute(`UPDATE accounts SET balance = ? WHERE id = ?`, [
        newSenderBalance,
        account_id,
      ]);

      const [transferOutResult] = await db.execute(
        `INSERT INTO transactions (account_id, type, amount, target_id) VALUES (?, ?, ?, ?)`,
        [account_id, 'transfer_out', amountNum, target_account_id]
      );

      await db.execute(`UPDATE accounts SET balance = ? WHERE id = ?`, [
        newReceiverBalance,
        target_account_id,
      ]);

      const [transferInResult] = await db.execute(
        `INSERT INTO transactions (account_id, type, amount, target_id) VALUES (?, ?, ?, ?)`,
        [target_account_id, 'transfer_in', amountNum, account_id]
      );

      const [transferOutTransactions] = await db.execute(
        `SELECT id, type, amount, target_id, created_at FROM transactions WHERE id = ?`,
        [transferOutResult.insertId]
      );

      const [transferInTransactions] = await db.execute(
        `SELECT id, type, amount, target_id, created_at FROM transactions WHERE id = ?`,
        [transferInResult.insertId]
      );

      const {
        id: tfout_id,
        type: tfout_type,
        amount: tfout_amount,
        target_id: tfout_receiver_id,
        created_at: tfout_time,
      } = transferOutTransactions[0];

      const {
        id: tfin_id,
        type: tfin_type,
        amount: tfin_amount,
        target_id: tfin_sender_id,
        created_at: tfin_time,
      } = transferInTransactions[0];

      console.table([
        {
          transaction_id: tfout_id,
          type: tfout_type,
          amount: Number(tfout_amount),
          receiver_id: tfout_receiver_id,
          receiver_name: target_account_name,
          created_at: tfout_time,
        },
      ]);

      console.table([
        {
          transaction_id: tfin_id,
          type: tfin_type,
          amount: Number(tfin_amount),
          sender_id: tfin_sender_id,
          sender_name: account_name,
          created_at: tfin_time,
        },
      ]);

      console.info('Your money was transferred out successfully!');
    } catch (err) {
      console.error('Transfer Error:', err.message);
    } finally {
      await db.end();
    }
  });

program.parseAsync();
