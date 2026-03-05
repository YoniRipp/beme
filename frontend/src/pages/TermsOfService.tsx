import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Acceptance of Terms',
    content:
      'By accessing or using BeMe, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.',
  },
  {
    title: 'Use of Service',
    content:
      'You agree to use BeMe only for lawful purposes and in accordance with these terms. You are responsible for maintaining the confidentiality of your account credentials.',
  },
  {
    title: 'User Data',
    content:
      'You retain ownership of all data you input into BeMe. By using the service, you grant us a limited license to process and store your data as necessary to provide the service.',
  },
  {
    title: 'Intellectual Property',
    content:
      'BeMe and its content, features, and functionality are owned by BeMe and are protected by copyright, trademark, and other intellectual property laws.',
  },
  {
    title: 'Limitation of Liability',
    content:
      'BeMe is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: 'Changes',
    content:
      'We may modify these terms at any time. We will notify you of material changes by posting the updated terms on this page with a new "Last updated" date.',
  },
  {
    title: 'Contact',
    content:
      'For questions about these Terms of Service, please contact us through the app or at the contact information provided on our website.',
  },
];

export function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-24 pb-16 lg:px-8">
      <Link
        to="/welcome"
        className="text-sm text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        &larr; Back to home
      </Link>
      <h1 className="text-3xl font-extrabold text-foreground mb-2">Terms of Service</h1>
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
