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
                <!-- logo temporarily hidden
                <img src="cid:logo" alt="RMS" class="logo-img">
                -->
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
                    <strong>Global Nuam Team</strong>
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

  /**
   * Template for bulk forwarding multiple candidate documents
   */
  static bulkForwardDocuments(data: {
    projectTitle: string;
    candidates: Array<{ name: string; role: string }>;
    gdriveLink?: string;
    notes?: string | null;
  }) {
    const { projectTitle, candidates, gdriveLink, notes } = data;

    const candidateRows = candidates.map(c => `
      <div style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-weight: 500; color: #202124;">${c.name}</div>
        <div style="font-size: 12px; color: #70757a;">${c.role}</div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #f1f3f4; font-family: 'Google Sans', Roboto, sans-serif; }
        .outer-wrapper { padding: 40px 20px; }
        .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #dadce0; overflow: hidden; }
        .header { padding: 32px 40px; background: #f8f9fa; border-bottom: 1px solid #e8eaed; }
        .main-title { font-size: 20px; font-weight: 500; color: #3c4043; margin: 0; }
        .content { padding: 32px 40px; color: #5f6368; font-size: 14px; line-height: 1.6; }
        .candidate-list { margin: 24px 0; border: 1px solid #e8eaed; border-radius: 4px; }
        .gdrive-banner { background-color: #e8f0fe; border: 1px solid #d2e3fc; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
        .button { background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block; margin-top: 10px; }
        .footer { padding: 0 40px 32px; color: #70757a; font-size: 12px; }
    </style>
</head>
<body>
    <div class="outer-wrapper">
        <div class="container">
            <div class="header">
                <h1 class="main-title">Batch Candidate Submission: ${projectTitle}</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                <p>We have processed and verified the documentation for <strong>${candidates.length} candidates</strong> for the <strong>${projectTitle}</strong> project.</p>
                
                <div class="candidate-list">
                    <div style="background: #f8f9fa; padding: 10px; font-weight: bold; border-bottom: 1px solid #e8eaed; font-size: 12px; text-transform: uppercase;">Candidates Included (${candidates.length})</div>
                    ${candidateRows}
                </div>

                ${gdriveLink ? `
                <div class="gdrive-banner">
                    <div style="font-weight: 500; color: #1967d2; font-size: 16px; margin-bottom: 8px;">Documents Shared via Google Drive</div>
                    <p style="margin-bottom: 16px;">Due to the size and number of documents, we have compiled them into a secure folder for your review.</p>
                    <a href="${gdriveLink}" class="button" target="_blank">Access Shared Folder</a>
                </div>` : '<p>All candidate documents are attached to this email for your reference.</p>'}

                ${notes ? `
                <div style="background-color: #f8f9fa; border-left: 4px solid #1a73e8; padding: 16px; margin: 24px 0; font-style: italic;">
                    "${notes}"
                </div>` : ''}

                <p>Kindly review the profiles and let us know your feedback on the next steps.</p>
                
                <p style="margin-top: 32px;">Cheers,<br><strong>Global Nuam Team</strong></p>
            </div>
            
            <div class="footer">
                <p>Resource Management System &copy; 2026</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  // You can add more templates here later (e.g., Welcome, Reset Password, etc.)
}
