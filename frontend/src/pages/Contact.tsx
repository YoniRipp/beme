import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Clock, MessageSquare, Bug, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CONTACT_METHODS = [
  {
    icon: Mail,
    title: 'General Support',
    description: 'Questions about your account, features, or billing.',
    email: 'support@trackvibe.app',
  },
  {
    icon: Bug,
    title: 'Bug Reports',
    description: 'Found something broken? Let us know and we\'ll fix it.',
    email: 'support@trackvibe.app',
  },
  {
    icon: MessageSquare,
    title: 'Partnerships',
    description: 'Interested in working together? We\'d love to hear from you.',
    email: 'hello@trackvibe.app',
  },
];

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  function handleSend() {
    const mailSubject = encodeURIComponent(subject || `TrackVibe Contact: Message from ${name || 'Website Visitor'}`);
    const mailBody = encodeURIComponent(`From: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@trackvibe.app?subject=${mailSubject}&body=${mailBody}`;
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12 text-center">
        <Link
          to="/welcome"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get in Touch</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Have a question, suggestion, or need help with your account? We're here for you.
        </p>
      </section>

      {/* Contact Methods */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {CONTACT_METHODS.map((method) => (
            <Card key={method.title} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6 space-y-3">
                <method.icon className="h-8 w-8 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">{method.title}</h3>
                <p className="text-sm text-muted-foreground">{method.description}</p>
                <a
                  href={`mailto:${method.email}`}
                  className="inline-block text-sm font-medium text-primary hover:underline"
                >
                  {method.email}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-10 md:grid-cols-2">
            {/* Form */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Send us a message</h2>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-subject">Subject</Label>
                  <Input
                    id="contact-subject"
                    placeholder="What's this about?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="How can we help?"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleSend}>
                  Send Message
                </Button>
              </CardContent>
            </Card>

            {/* Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Quick Info</h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">
                        We typically respond within 24 hours on business days.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Email Us Directly</p>
                      <a
                        href="mailto:support@trackvibe.app"
                        className="text-sm text-primary hover:underline"
                      >
                        support@trackvibe.app
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    For account-related issues, please include your registered email address
                    so we can help you faster.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">Billing & Subscriptions</p>
                  <p className="text-sm text-muted-foreground">
                    Manage your subscription, update payment info, or cancel anytime through
                    your account settings or the Lemon Squeezy customer portal.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
