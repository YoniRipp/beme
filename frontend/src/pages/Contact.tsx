import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-24 pb-16 lg:px-8">
      <Link
        to="/welcome"
        className="text-sm text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        &larr; Back to home
      </Link>
      <h1 className="text-3xl font-extrabold text-foreground mb-2">Contact Us</h1>
      <div className="space-y-10">
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Have questions, feedback, or need help? We'd love to hear from you.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Get in Touch</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>support@beme.life</span>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Report an Issue</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Found a bug or have a feature request? You can report issues through the app's
            settings page or reach out to us directly.
          </p>
        </div>
      </div>
    </div>
  );
}
