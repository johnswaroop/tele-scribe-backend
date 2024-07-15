const nodemailer = require('nodemailer');
const supabase = require('./supabase');


const sendMail = async (job) => {
    if (!job) {
        console.log("invalid job name")
    }
    let db = await supabase.from("jobs").select("*").eq("title", job);
    let caller = db.data[0]

    let callerEmail = caller.email;

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });


    let html = `
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email and Medical Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f0f0f0; padding: 20px;">
    
    <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);">
        <h2 style="color: #333333;">Verify Your Email and Call Report</h2>
        <p>Dear Caller,</p>
        <p>Thank you for reaching out to us regarding your recent call. To ensure the accuracy and completeness of your medical report, we kindly request your verification.</p>
        <p style="text-align: center;">
            <a href="${process.env.CLIENT}/validate/${job}" style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 5px;">Verify Now</a>
        </p>
        <p>Verification is crucial for us to proceed with processing your information accurately. If you encounter any issues or have questions, please do not hesitate to contact us at [Your Contact Information].</p>
        <p>Thank you for your prompt attention to this matter.</p>
        <p>Best regards,<br>
       P101<br>
    </div>
    
    </body>
    </html>
    `

    let mailOptions = {
        from: `"P101" <${process.env.EMAIL_USER}>`,
        to: callerEmail,
        subject: 'Verify Your Email and Call Report',
        html: html
    };


    transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        let update = await supabase.from("jobs").update({
            "email_sent": true
        }).eq("title", job).select()
        console.log(update)
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    });
}

module.exports = sendMail