import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <p className="text-sm text-muted-foreground mb-2">Last updated: March 2026</p>
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        TrackVibe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
        explains how we collect, use, disclose, and safeguard your information when you use our
        life management application, including our website, mobile applications, and related
        services (collectively, the "Service"). Please read this policy carefully. By using TrackVibe,
        you agree to the collection and use of information in accordance with this policy.
      </p>

      {/* 1. Information We Collect */}
      <h2 className="text-xl font-semibold mt-8 mb-3">1. Information We Collect</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We collect information that you provide directly to us, as well as information generated
        through your use of the Service. The types of data we collect include:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Account data:</strong> Your name, email address, and a securely hashed version
          of your password. We never store your password in plain text.
        </li>
        <li>
          <strong>Health and fitness data:</strong> Workout logs (exercises, sets, reps, weight),
          food entries (calories, macronutrients), sleep duration, and daily wellness check-ins
          including energy and mood ratings.
        </li>
        <li>
          <strong>Goals:</strong> Personal goals related to calories, workouts, and sleep, including
          target values and time periods.
        </li>
        <li>
          <strong>Voice input:</strong> Text transcripts of voice commands you submit to our voice
          assistant feature. When using audio input, the audio data is processed and discarded; only
          the resulting transcript and parsed intent are retained.
        </li>
        <li>
          <strong>Usage data:</strong> Log data such as IP address, browser type, pages visited,
          and timestamps, collected automatically when you access the Service.
        </li>
      </ul>

      {/* 2. How We Use Your Information */}
      <h2 className="text-xl font-semibold mt-8 mb-3">2. How We Use Your Information</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We use the information we collect for the following purposes:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Provide and maintain the Service:</strong> To operate your account, store your
          data, and deliver the core functionality of TrackVibe including tracking and
          goal management.
        </li>
        <li>
          <strong>Personalize AI insights:</strong> To generate personalized analytics, trends,
          and recommendations based on your health and fitness data.
        </li>
        <li>
          <strong>Process voice commands:</strong> To interpret your natural language input and
          convert it into structured actions such as logging workouts,
          adding food entries, or tracking sleep.
        </li>
        <li>
          <strong>Generate analytics:</strong> To compute summaries, charts, streaks, and trend
          data that help you understand your habits and progress over time.
        </li>
        <li>
          <strong>Improve the Service:</strong> To identify and fix bugs, analyze usage patterns,
          and develop new features that better serve our users.
        </li>
        <li>
          <strong>Communicate with you:</strong> To send you account-related notices, security
          alerts, and updates about material changes to our policies or Service.
        </li>
      </ul>

      {/* 3. Health & Fitness Data */}
      <h2 className="text-xl font-semibold mt-8 mb-3">3. Health & Fitness Data</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We recognize that health and fitness data is particularly sensitive. Your workout logs,
        food entries, sleep records, and daily check-ins are treated with the highest level of
        care. This data is stored securely in our database and is accessible only to you through
        your authenticated account.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We will never sell your health and fitness data to third parties. This data is used
        exclusively to provide you with personal tracking, trend analysis, and AI-powered
        recommendations within the Service. We do not share your health data with insurance
        companies, employers, advertisers, or any other external parties.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        When you use AI-powered insights, your health data may be processed by our AI systems
        to generate personalized recommendations. These recommendations are generated solely for
        your benefit and are not used to build profiles for any third party.
      </p>

      {/* 4. Voice & AI Processing */}
      <h2 className="text-xl font-semibold mt-8 mb-3">4. Voice & AI Processing</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        TrackVibe offers a voice assistant feature powered by Google Gemini AI. When you use this
        feature, your input is processed as follows:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Text input:</strong> When you type or use browser-based speech recognition,
          the resulting text transcript is sent to Google Gemini for intent parsing. Google
          processes this text to determine the appropriate action (e.g., logging a workout
          or logging a workout) and returns the structured result.
        </li>
        <li>
          <strong>Audio input:</strong> When you submit audio directly, it is temporarily
          stored in our processing queue, sent to Google Gemini for transcription and intent
          parsing, and then deleted. Audio data is not retained after processing is complete.
        </li>
        <li>
          <strong>Google Gemini:</strong> Google processes your voice data in accordance with
          their API terms of service. Data sent to the Gemini API is not used by Google to
          train their models and is not stored beyond the time needed to process your request.
        </li>
        <li>
          <strong>Parsed results:</strong> The structured output from voice processing (such
          as food names, workout details, or sleep data) is stored in your account as
          part of your regular data.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        You can use TrackVibe without the voice feature. All actions available through voice input
        can also be performed manually through the application interface.
      </p>

      {/* 5. Data Sharing */}
      <h2 className="text-xl font-semibold mt-8 mb-3">5. Data Sharing</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We do not sell, rent, or trade your personal data to third parties. We share your
        information only in the following limited circumstances:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Payment processor (Lemon Squeezy):</strong> If you purchase a paid plan,
          your billing information (name, email, payment details) is processed by Lemon Squeezy,
          our payment provider. We do not store your full payment card details on our servers.
        </li>
        <li>
          <strong>AI provider (Google):</strong> Voice transcripts and text input are sent to
          Google Gemini for processing, as described in the Voice & AI Processing section above.
        </li>
        <li>
          <strong>Infrastructure providers:</strong> Your data is hosted on our cloud
          infrastructure providers, who process data on our behalf under strict contractual
          obligations.
        </li>
        <li>
          <strong>Legal requirements:</strong> We may disclose your information if required by
          law, regulation, legal process, or governmental request, or to protect the rights,
          safety, or property of TrackVibe, our users, or others.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We do not work with advertising partners and do not display third-party advertisements
        in the Service. Your data is never used for targeted advertising.
      </p>

      {/* 6. Data Security */}
      <h2 className="text-xl font-semibold mt-8 mb-3">6. Data Security</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We implement industry-standard security measures to protect your data:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Encryption in transit:</strong> All data transmitted between your device and
          our servers is encrypted using HTTPS with TLS 1.2 or higher.
        </li>
        <li>
          <strong>Password security:</strong> Passwords are hashed using bcrypt with a secure
          salt before storage. We never store or have access to your plain-text password.
        </li>
        <li>
          <strong>Authentication:</strong> Sessions are managed using JSON Web Tokens (JWT)
          with configurable expiration. Tokens are validated on every authenticated request.
        </li>
        <li>
          <strong>Rate limiting:</strong> API endpoints are protected by rate limiting to
          prevent abuse and brute-force attacks.
        </li>
        <li>
          <strong>Security headers:</strong> Our servers use Helmet middleware to set security
          headers including Content Security Policy, X-Frame-Options, and others.
        </li>
        <li>
          <strong>Input validation:</strong> All user input is validated using schema validation
          (Zod) to prevent injection attacks and malformed data.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        While we strive to protect your data, no method of electronic transmission or storage
        is completely secure. We cannot guarantee absolute security, but we are committed to
        promptly addressing any security incidents and notifying affected users as required
        by applicable law.
      </p>

      {/* 7. Data Retention */}
      <h2 className="text-xl font-semibold mt-8 mb-3">7. Data Retention</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We retain your data according to the following policies:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Active accounts:</strong> Your account data and all associated records
          (workouts, food entries, goals, and check-ins) are retained
          for as long as your account remains active.
        </li>
        <li>
          <strong>Account deletion:</strong> When you request account deletion, all your
          personal data is permanently removed from our production systems within 30 days.
          This includes all health and goal data associated with your
          account.
        </li>
        <li>
          <strong>Backup retention:</strong> Encrypted backups that may contain your data are
          retained for up to 30 days after deletion from production systems, after which they
          are permanently purged.
        </li>
        <li>
          <strong>Voice data:</strong> Audio recordings are deleted immediately after
          processing. Text transcripts from voice commands are not retained separately from
          the resulting data entries they create.
        </li>
        <li>
          <strong>Anonymized data:</strong> We may retain anonymized, aggregated data that
          cannot be used to identify you for analytical and service improvement purposes.
        </li>
      </ul>

      {/* 8. Your Rights */}
      <h2 className="text-xl font-semibold mt-8 mb-3">8. Your Rights</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Depending on your location, you may have the following rights regarding your personal
        data:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Access:</strong> You have the right to request a copy of the personal data
          we hold about you. Most of your data is directly accessible through the application
          at any time.
        </li>
        <li>
          <strong>Correction:</strong> You can update or correct your personal information
          directly within the application, or contact us to request corrections.
        </li>
        <li>
          <strong>Deletion:</strong> You have the right to request the deletion of your account
          and all associated personal data.
        </li>
        <li>
          <strong>Data portability:</strong> You have the right to request an export of your
          data in a structured, commonly used, and machine-readable format.
        </li>
        <li>
          <strong>Opt-out of AI features:</strong> You can use TrackVibe without the voice assistant
          or AI-powered insights. All core functionality is available without AI processing.
        </li>
      </ul>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <strong>For residents of the European Economic Area (GDPR):</strong> You have additional
        rights including the right to restrict processing, the right to object to processing
        based on legitimate interests, and the right to lodge a complaint with your local data
        protection authority. Our legal basis for processing your data is your consent (provided
        at account creation) and the performance of the contract to provide you the Service.
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <strong>For California residents (CCPA):</strong> You have the right to know what
        personal information we collect, disclose, and sell (we do not sell your data). You
        have the right to request deletion of your data and to opt out of any sale of personal
        information. We will not discriminate against you for exercising these rights. To submit
        a verifiable consumer request, please contact us using the information in the Contact
        Us section below.
      </p>

      {/* 9. Cookies */}
      <h2 className="text-xl font-semibold mt-8 mb-3">9. Cookies</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        TrackVibe uses a minimal set of cookies and local storage necessary for the Service to
        function:
      </p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <strong>Authentication token:</strong> A JWT token is stored in your browser's local
          storage to maintain your authenticated session. This is essential for the application
          to function and cannot be disabled while using the Service.
        </li>
        <li>
          <strong>Session preferences:</strong> Basic preferences such as your selected view
          or filters may be stored locally to improve your experience.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We do not use third-party tracking cookies. We do not use cookies for advertising,
        behavioral profiling, or cross-site tracking. No data is shared with third-party
        analytics or advertising platforms through cookies.
      </p>

      {/* 10. Children's Privacy */}
      <h2 className="text-xl font-semibold mt-8 mb-3">10. Children's Privacy</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        TrackVibe is not directed at children under the age of 13 (or the applicable minimum age
        in your jurisdiction). We do not knowingly collect personal information from children
        under 13. If we become aware that we have collected personal data from a child under
        13 without parental consent, we will take steps to delete that information as quickly
        as possible. If you believe that a child under 13 has provided us with personal data,
        please contact us immediately using the information in the Contact Us section below.
      </p>

      {/* 11. Changes to This Policy */}
      <h2 className="text-xl font-semibold mt-8 mb-3">11. Changes to This Policy</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We may update this Privacy Policy from time to time to reflect changes in our practices,
        technology, legal requirements, or other factors. When we make material changes to this
        policy, we will notify you by sending an email to the address associated with your
        account at least 30 days before the changes take effect. We will also update the "Last
        updated" date at the top of this page. We encourage you to review this Privacy Policy
        periodically. Your continued use of the Service after the effective date of any changes
        constitutes your acceptance of the updated policy.
      </p>

      {/* 12. Contact Us */}
      <h2 className="text-xl font-semibold mt-8 mb-3">12. Contact Us</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        If you have any questions, concerns, or requests regarding this Privacy Policy or our
        data practices, please contact us at:
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <strong>Email:</strong>{" "}
        <a
          href="mailto:privacy@trackvibe.app"
          className="text-primary underline hover:no-underline"
        >
          privacy@trackvibe.app
        </a>
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        We aim to respond to all privacy-related inquiries within 30 days. For data access,
        correction, or deletion requests, we may need to verify your identity before processing
        your request to ensure the security of your account.
      </p>
    </div>
  );
}
