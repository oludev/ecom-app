const nodemailer = require('nodemailer');

// Shared transporter for both functions
const transporter = nodemailer.createTransport({
   host: 'smtp.gmail.com',
  port: 465, // instead of 465
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends an order receipt to the user
 */
async function sendUserReceipt({ toEmail, logoUrl, name, orderItems, amount, tx_ref }) {
  try {
    const itemsHtml = orderItems.map(item =>
      `<li>${item.name} (Qty: ${item.quantity}) - BGN ${(item.price * item.quantity).toFixed(2)}</li>`
    ).join('');

    const html = `
      <div style="font-family: Poppins, sans-serif; padding: 20px;
          background-color: #f8f9fa;">
        <img src="${logoUrl}" style="max-width: 120px; margin-bottom: 20px;" />
        <h2>Order Receipt</h2>
        <p>Hi ${name},</p>
        <p>Thank you for your order. Here's your receipt:</p>
        <p><strong>Transaction Ref:</strong> ${tx_ref}</p>
        <ul style="list-style-type:none; padding:0;">${itemsHtml}</ul>
        <p><strong>Total Paid:</strong> BGN ${amount.toFixed(2)}</p>
        <p>We appreciate your patronage :)</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"9jaFrozenFoods" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your Order Receipt - 9jaFrozenFoods',
      html
    });

    console.log(`Receipt email sent to ${toEmail}`);
  } catch (error) {
    console.error(`Failed to send receipt email to ${toEmail}:`, error.message);
  }
}

/**
 * Sends a password reset email
 */
async function sendResetEmail(email, resetLink) {
  try {
    const html = `
      <h3>Password Reset</h3>
      <p>You requested to reset your password.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in <strong>30 minutes</strong>.</p>
    `;

    await transporter.sendMail({
      from: `"9jaFrozenFoods" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your password',
      html
    });

    console.log(`Reset email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send reset email to ${email}:`, error.message);
  }
}

module.exports = { sendUserReceipt, sendResetEmail };
