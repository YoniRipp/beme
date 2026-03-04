import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <p className="text-sm text-muted-foreground mb-2">Last updated: March 2026</p>
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <h2 className="text-xl font-semibold mt-8 mb-3">1. Acceptance of Terms</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        By accessing or using BeMe ("the Service"), including our website, mobile applications,
        and any associated services, you agree to be bound by these Terms of Service ("Terms").
        If you do not agree to these Terms, you may not access or use the Service.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        You must be at least 13 years of age to use BeMe. If you are between 13 and 18 years
        old, you must have the consent of a parent or legal guardian to use the Service. By
        using BeMe, you represent and warrant that you meet these age requirements. We reserve
        the right to terminate accounts that we discover are operated by users under the
        minimum age.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">2. Description of Service</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        BeMe is a life management platform designed to help you track and manage multiple
        aspects of your daily life. The Service provides tools for:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>Financial tracking, including income, expenses, budgets, and savings goals</li>
        <li>Body and workout logging with exercise details, sets, reps, and weight tracking</li>
        <li>Energy and nutrition management, including food logging, calorie tracking, and macronutrient breakdowns</li>
        <li>Schedule management with daily planning, recurring events, and category-based organization</li>
        <li>Goal setting and progress tracking across health, fitness, and financial domains</li>
        <li>Group collaboration for households, projects, and shared activities</li>
        <li>AI-powered features including voice input via Google Gemini, natural language processing for data entry, and AI-generated insights</li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        The Service may evolve over time. We reserve the right to modify, suspend, or
        discontinue any feature or aspect of BeMe at our discretion, with reasonable notice
        provided to users when possible.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">3. Account Registration</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        To use most features of BeMe, you must create an account. When registering, you agree to:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>Provide accurate, current, and complete information during registration</li>
        <li>Maintain and promptly update your account information to keep it accurate and current</li>
        <li>Maintain the security and confidentiality of your login credentials</li>
        <li>Accept responsibility for all activities that occur under your account</li>
        <li>Notify us immediately of any unauthorized use of your account</li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Each person may maintain only one account. Creating multiple accounts to circumvent
        restrictions, abuse free-tier limits, or for any deceptive purpose is prohibited and
        may result in termination of all associated accounts. You may sign in using
        email/password or supported social login providers (Google, Facebook, Twitter).
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">4. Free and Pro Plans</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        BeMe offers two service tiers:
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <strong>Free Plan:</strong> Includes manual tracking for money, workouts, nutrition,
        schedule, and goals. You can log transactions, record workouts, track food and
        calories, manage your daily schedule, and set goals at no cost. The Free Plan provides
        the core functionality needed to manage your daily life.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <strong>Pro Plan:</strong> Unlocks AI-powered features including voice input for
        hands-free data entry, AI-generated insights and recommendations, advanced analytics,
        and priority support. Pro subscriptions are billed on a monthly or yearly basis through
        Lemon Squeezy, our payment processor. Yearly plans offer a discounted rate compared to
        monthly billing.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We may adjust the features included in each plan from time to time. If we remove a
        feature from the Free Plan that you actively use, we will provide at least 30 days of
        notice before the change takes effect.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">5. Subscriptions and Payments</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Pro subscriptions are billed on a recurring basis (monthly or yearly) through Lemon
        Squeezy. By subscribing to a Pro plan, you authorize Lemon Squeezy to charge your
        chosen payment method at the beginning of each billing cycle.
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Recurring billing:</strong> Your subscription automatically renews at the end
          of each billing period unless you cancel before the renewal date.
        </li>
        <li>
          <strong>Cancellation:</strong> You may cancel your Pro subscription at any time
          through the Lemon Squeezy customer portal. Upon cancellation, you will retain access
          to Pro features until the end of your current billing period, after which your
          account will revert to the Free Plan.
        </li>
        <li>
          <strong>No partial refunds:</strong> We do not offer refunds for partial billing
          periods. If you cancel mid-cycle, you will continue to have Pro access for the
          remainder of the period you have already paid for.
        </li>
        <li>
          <strong>Price changes:</strong> We reserve the right to change subscription pricing.
          If we increase prices, we will provide at least 30 days of advance notice via email
          or in-app notification. The new price will apply at your next billing cycle after the
          notice period. If you do not agree with the new pricing, you may cancel before the
          next renewal.
        </li>
        <li>
          <strong>Payment management:</strong> All billing, invoices, payment method updates,
          and subscription management are handled through the Lemon Squeezy customer portal.
          BeMe does not directly store your credit card or payment information.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">6. User Content and Data</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        You retain full ownership of all data you enter into BeMe, including your financial
        records, workout logs, food entries, schedule items, goals, and any other personal
        information ("User Content"). By using the Service, you grant BeMe a limited,
        non-exclusive, worldwide license to process, store, and display your User Content
        solely for the purpose of providing and improving the Service.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        You are solely responsible for the accuracy, completeness, and legality of the data
        you enter. BeMe does not verify the accuracy of user-entered data such as financial
        transactions, calorie counts, or workout metrics. If you use voice input or AI
        features to enter data, you should review the parsed results for accuracy before
        relying on them.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We may use aggregated, anonymized data derived from User Content for analytics,
        research, and service improvement purposes. Such aggregated data will not identify
        you personally.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">7. Prohibited Conduct</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        When using BeMe, you agree not to:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>Use the Service for any illegal or unauthorized purpose</li>
        <li>Abuse, harass, threaten, or intimidate other users, including within shared groups</li>
        <li>Use automated scripts, bots, scrapers, or other automated means to access or interact with the Service</li>
        <li>Attempt to reverse engineer, decompile, disassemble, or otherwise derive the source code of any part of the Service</li>
        <li>Interfere with or disrupt the Service, servers, or networks connected to the Service</li>
        <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with a person or entity</li>
        <li>Attempt to gain unauthorized access to other users' accounts, data, or any part of the Service not intended for you</li>
        <li>Upload or transmit malicious code, viruses, or any other harmful content</li>
        <li>Use the Service to engage in any form of financial fraud or money laundering</li>
        <li>Resell, sublicense, or commercially exploit the Service without our express written permission</li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Violation of these rules may result in immediate suspension or termination of your
        account, at our sole discretion.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">8. Health Disclaimer</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        BeMe is a personal tracking and organizational tool. It is <strong>not</strong> a
        medical device, and the Service does <strong>not</strong> provide medical advice,
        diagnosis, or treatment. The health, nutrition, and fitness features of BeMe are
        intended for general informational and self-tracking purposes only.
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          Calorie counts, macronutrient breakdowns, and nutrition data displayed in BeMe are
          estimates based on available food databases and user input. They may not be perfectly
          accurate and should not be relied upon for medical dietary planning.
        </li>
        <li>
          AI-generated insights and recommendations are produced by machine learning models and
          are not reviewed by medical professionals. They are intended as general suggestions
          and should not replace professional advice.
        </li>
        <li>
          Always consult a qualified healthcare provider before starting any new diet, exercise
          program, or making significant changes to your health routine.
        </li>
        <li>
          BeMe is not a substitute for professional medical, nutritional, or financial advice.
          You should consult qualified professionals for decisions related to your health,
          dietary needs, or financial planning.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        If you experience a medical emergency, contact emergency services immediately. Do not
        rely on BeMe for any urgent health or safety decisions.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">9. Intellectual Property</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        The BeMe name, logo, brand identity, visual design, user interface, software code, and
        all related intellectual property are owned by BeMe and are protected by copyright,
        trademark, and other intellectual property laws. You may not copy, modify, distribute,
        or create derivative works based on BeMe's intellectual property without our express
        written consent.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        As stated in Section 6, you retain ownership of all User Content you create within the
        Service. Nothing in these Terms transfers ownership of your personal data to BeMe. You
        may export or delete your data at any time through the Service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">10. Limitation of Liability</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        The Service is provided on an "as is" and "as available" basis without warranties of
        any kind, whether express or implied, including but not limited to implied warranties
        of merchantability, fitness for a particular purpose, and non-infringement.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        BeMe does not warrant that:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>The Service will be uninterrupted, timely, secure, or error-free</li>
        <li>AI-generated content, including voice transcription results and insights, will be accurate or complete</li>
        <li>Nutrition data, calorie estimates, or food database information will be accurate</li>
        <li>The results obtained from using the Service will meet your specific requirements</li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        To the maximum extent permitted by applicable law, BeMe and its officers, directors,
        employees, and agents shall not be liable for any indirect, incidental, special,
        consequential, or punitive damages, including but not limited to loss of profits, data,
        or goodwill, arising out of or in connection with your use of the Service. You
        acknowledge that decisions you make based on data displayed in BeMe -- including
        financial decisions, dietary choices, and exercise routines -- are made at your own
        risk.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        In no event shall BeMe's total aggregate liability to you for all claims arising out of
        or relating to the Service exceed the total amount of subscription fees you have paid
        to BeMe in the twelve (12) months preceding the event giving rise to the claim, or
        fifty US dollars ($50), whichever is greater.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">11. Termination</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We reserve the right to suspend or terminate your account at any time if we reasonably
        believe you have violated these Terms, engaged in prohibited conduct, or if required by
        law. In cases of minor violations, we will attempt to notify you and give you an
        opportunity to correct the issue before taking action. However, we may immediately
        terminate accounts involved in severe violations, including fraud, abuse, or illegal
        activity.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        You may delete your account at any time through the Settings page in the application.
        Upon account deletion, we will permanently remove your personal data from our active
        systems within 30 days. Some data may be retained in encrypted backups for a limited
        period as required for legal, regulatory, or legitimate business purposes, after which
        it will be purged.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        If your account is terminated while you have an active Pro subscription, you will not
        receive a refund for the remaining portion of your billing period unless the
        termination was due to our error or a defect in the Service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">12. Governing Law</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        These Terms shall be governed by and construed in accordance with the laws of the State
        of Delaware, United States of America, without regard to its conflict of law
        principles. Any disputes arising out of or relating to these Terms or the Service shall
        be resolved exclusively in the state or federal courts located in the State of
        Delaware, and you consent to the personal jurisdiction of such courts.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">13. Changes to Terms</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We may update these Terms from time to time to reflect changes in the Service, legal
        requirements, or business practices. For material changes, we will provide at least 30
        days of advance notice through email or a prominent in-app notification before the
        revised Terms take effect.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Your continued use of BeMe after the revised Terms take effect constitutes your
        acceptance of the changes. If you do not agree with the updated Terms, you should stop
        using the Service and delete your account before the changes take effect. The "Last
        updated" date at the top of this page indicates when these Terms were most recently
        revised.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">14. Contact Us</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        If you have any questions, concerns, or feedback about these Terms of Service or the
        BeMe platform, please contact us at:
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <a
          href="mailto:legal@beme.app"
          className="text-primary underline hover:no-underline"
        >
          legal@beme.app
        </a>
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We aim to respond to all inquiries within five business days.
      </p>
    </div>
  );
}
