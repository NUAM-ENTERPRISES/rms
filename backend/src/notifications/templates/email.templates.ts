export class EmailTemplates {
  /**
   * Professional template for forwarding candidate documents to clients
   */
  static forwardDocuments(data: {
    candidateName: string;
    projectTitle: string;
    roleLabel: string;
    notes?: string | null;
  }) {
    const { candidateName, projectTitle, roleLabel, notes } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f1f3f4;
            font-family: 'Google Sans', Roboto, 'Helvetica Neue', Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .outer-wrapper {
            padding: 40px 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            border: 1px solid #dadce0;
            overflow: hidden;
        }
        .header {
            padding: 32px 40px 16px 40px;
            text-align: left;
        }
        .logo-img {
            height: 32px;
            width: auto;
            margin-bottom: 24px;
        }
        .main-title {
            font-size: 22px;
            font-weight: 500;
            color: #3c4043;
            margin: 0;
            line-height: 1.4;
        }
        .content {
            padding: 0 40px 32px 40px;
            color: #5f6368;
            font-size: 14px;
            line-height: 20px;
        }
        .form-section {
            margin: 24px 0;
            border-top: 1px solid #e8eaed;
            padding-top: 16px;
        }
        .data-row {
            margin-bottom: 16px;
        }
        .data-label {
            display: block;
            color: #70757a;
            font-size: 12px;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
            text-transform: uppercase;
            font-weight: 700;
        }
        .data-value {
            color: #202124;
            font-size: 15px;
            font-weight: 400;
        }
        .remark-box {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 16px;
            border: 1px solid #e8eaed;
            margin: 24px 0;
        }
        .remark-label {
            color: #3c4043;
            font-weight: 500;
            font-size: 13px;
            margin-bottom: 8px;
            display: block;
        }
        .remark-text {
            color: #5f6368;
            font-style: italic;
            font-size: 14px;
        }
        .divider {
            height: 1px;
            background-color: #e8eaed;
            margin: 32px 0;
        }
        .footer {
            padding: 0 40px 32px 40px;
            color: #70757a;
            font-size: 12px;
            line-height: 18px;
        }
        .footer-logo {
            font-weight: 500;
            color: #3c4043;
            margin-bottom: 8px;
            display: block;
        }
    </style>
</head>
<body>
    <div class="outer-wrapper">
        <div class="container">
            <div class="header">
                <img src="cid:logo" alt="RMS" class="logo-img">
                <h1 class="main-title">Candidate profile for your review</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                <p>A new candidate profile has been shared with you for the following role. All associated documents have been verified through our internal screening process and are attached for your reference.</p>
                
                <div class="form-section">
                    <div class="data-row">
                        <span class="data-label">Candidate</span>
                        <div class="data-value">${candidateName}</div>
                    </div>
                    
                    <div class="data-row">
                        <span class="data-label">Applied for</span>
                        <div class="data-value">${roleLabel}</div>
                    </div>
                    
                    <div class="data-row">
                        <span class="data-label">Associated project</span>
                        <div class="data-value">${projectTitle}</div>
                    </div>
                </div>

                ${notes ? `
                <div class="remark-box">
                    <span class="remark-label">Recruiter's comment</span>
                    <div class="remark-text">"${notes}"</div>
                </div>` : ''}

                <div class="divider"></div>
                
                <p>Kindly review the attachments and update us on the next steps for evaluation.</p>
                
                <p style="margin-top: 32px;">
                    Cheers,<br>
                    <strong>Global Recruitment Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <span class="footer-logo">Resource Management System</span>
                <p>This email was sent from a secure document portal. If you have questions or encountered technical issues, please contact our support desk.</p>
                <p>&copy; 2026 RMS. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  // You can add more templates here later (e.g., Welcome, Reset Password, etc.)
}
