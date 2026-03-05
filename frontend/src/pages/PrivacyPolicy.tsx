import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Data We Collect',
    content:
      'We collect information you provide directly, such as account details, transaction data, fitness logs, and any content you enter into BeMe. We also collect usage data to improve our service.',
  },
  {
    title: 'How We Use It',
    content:
      'We use your data to provide and improve BeMe, personalize your experience, process AI requests, and communicate with you. We do not sell your data to third parties.',
  },
  {
    title: 'Security',
    content:
      'We implement industry-standard security measures to protect your data, including encryption in transit and at rest. Your data is stored securely and access is restricted.',
  },
  {
    title: 'Your Rights',
    content:
      'You can access, correct, or delete your personal data at any time. You may export your data and request account deletion. Contact us to exercise these rights.',
  },
  {
    title: 'Changes',
    content:
      'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a new "Last updated" date.',
  },
  {
    title: 'Contact',
    content:
      'For questions about this Privacy Policy or your data, please contact us through the app or at the contact information provided on our website.',
  },
];

export function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-24 pb-16 lg:px-8">
      <Link
        to="/welcome"
        className="text-sm text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        &larr; Back to home
      </Link>
      <h1 className="text-3xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-12">
        Last updated: {new Date().toLocaleDateString()}
      </p>
      <div className="space-y-10">
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-lg font-semibold text-foreground mb-2">{section.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
