import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  PhoneCall,
  Calendar as CalendarIcon,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <Link className="flex items-center justify-center" href="/">
          <Bot className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-bold tracking-tight">
            AI Receptionist
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link
            className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
            href="#features"
          >
            Features
          </Link>
          <Link
            className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
            href="#how-it-works"
          >
            How It Works
          </Link>
          <Link
            className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
            href="#pricing"
          >
            Pricing
          </Link>
          <Link
            className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
            href="#faq"
          >
            FAQ
          </Link>
          <div className="flex items-center gap-2 ml-2 sm:ml-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-40 bg-muted/40 overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  Your 24/7{" "}
                  <span className="text-primary">AI Receptionist</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
                  Never miss a call, schedule appointments effortlessly, and
                  provide instant answers to your customers with our intelligent
                  AI receptionist.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    See How It Works
                  </Button>
                </Link>
              </div>
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-yellow-500 fill-yellow-500"
                    />
                  ))}
                  <span className="ml-2 font-medium text-foreground">
                    4.9/5 Rating
                  </span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div>Trusted by over 1,000+ businesses</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="w-full py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-primary font-medium">
                  Powerful Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Everything you need to manage calls
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mx-auto">
                  Our AI receptionist handles your incoming calls with
                  human-like understanding, routing, and scheduling
                  capabilities.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-8 py-8 lg:grid-cols-3">
              <Card className="h-full bg-background border-none shadow-none text-center">
                <CardHeader className="items-center pb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                    <PhoneCall className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Smart Call Routing</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Intelligently understand caller intent and route them to the
                  right department or person instantly without complex menus.
                </CardContent>
              </Card>
              <Card className="h-full bg-background border-none shadow-none text-center">
                <CardHeader className="items-center pb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                    <CalendarIcon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    Automated Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Allow callers to book, reschedule, or cancel appointments 24/7
                  directly through the phone, synced directly to your calendar.
                </CardContent>
              </Card>
              <Card className="h-full bg-background border-none shadow-none text-center">
                <CardHeader className="items-center pb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Spam Call Filtering</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Automatically detect and block spam or robocalls so you only
                  deal with legitimate customer inquiries and save time.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section
          id="how-it-works"
          className="w-full py-16 md:py-24 bg-muted/40"
        >
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Get started in minutes
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg mx-auto">
                Setting up your AI receptionist is easier than hiring a human,
                and a lot faster. Follow these three simple steps to automate
                your calls.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-12 md:grid-cols-3 relative">
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-[2px] bg-border z-0"></div>

              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl shadow-md border-4 border-muted">
                  1
                </div>
                <h3 className="text-xl font-bold">Connect Your Number</h3>
                <p className="text-muted-foreground">
                  Port your existing phone number or claim a new local or
                  toll-free number in one click from our dashboard.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl shadow-md border-4 border-muted">
                  2
                </div>
                <h3 className="text-xl font-bold">Customize the AI</h3>
                <p className="text-muted-foreground">
                  Give your receptionist a name, select a voice, and provide
                  business knowledge, business hours, and FAQs.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl shadow-md border-4 border-muted">
                  3
                </div>
                <h3 className="text-xl font-bold">Go Live 24/7</h3>
                <p className="text-muted-foreground">
                  Your AI receptionist starts answering calls, booking meetings,
                  and sending you transcripts instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section
          id="testimonials"
          className="w-full py-16 md:py-24 bg-background"
        >
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Loved by local businesses
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg mx-auto">
                See how our AI Receptionist is saving time and generating
                revenue for businesses just like yours.
              </p>
            </div>
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-muted/40 border-none">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-500 text-yellow-500"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 line-clamp-4">
                    "Our missed call rate dropped to zero overnight. The AI
                    sounds so natural that most clients don't even realize
                    they're talking to software. It books 10-15 haircuts a week
                    for us while we're sleeping!"
                  </p>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>SJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        Sarah Jenkins
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Owner, Radiant Salon
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-none">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-500 text-yellow-500"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 line-clamp-4">
                    "As a plumber, I'm always on the job and can rarely answer
                    my phone. Now, the AI handles scheduling and basic
                    questions. My revenue is up 30% simply because I'm no longer
                    missing initial quote inquiries."
                  </p>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>MR</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        Mike Ramirez
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mike's Plumbing
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-none md:col-span-2 lg:col-span-1">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-500 text-yellow-500"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 line-clamp-4">
                    "We used to pay $1,500/month for an answering service that
                    basically just took messages. The AI actually resolves
                    customer issues and integrates straight into our CRM. It's
                    an absolute game-changer."
                  </p>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>EC</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        Emily Chen
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Operations, TechFlow
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="w-full py-16 md:py-24 bg-muted/40">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg mx-auto">
                Choose the plan that best fits your business needs. No hidden
                fees or long-term contracts.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              <Card className="flex flex-col shadow-sm bg-background">
                <CardHeader>
                  <CardTitle className="text-2xl">Starter</CardTitle>
                  <CardDescription>
                    Perfect for small businesses and solo entrepreneurs.
                  </CardDescription>
                  <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                    $49
                    <span className="ml-1 text-xl font-medium text-muted-foreground">
                      /mo
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" /> 500
                      included minutes
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" /> 1
                      phone number
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" />{" "}
                      Standard AI voices
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" />{" "}
                      Email support
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/sign-up" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full py-6 text-md font-medium"
                    >
                      Start 7-Day Trial
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              <Card className="flex flex-col border-primary shadow-xl relative bg-background">
                <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground tracking-wide uppercase">
                  MOST POPULAR
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">Professional</CardTitle>
                  <CardDescription>
                    For growing teams with higher call volumes.
                  </CardDescription>
                  <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                    $149
                    <span className="ml-1 text-xl font-medium text-muted-foreground">
                      /mo
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" />{" "}
                      2,000 included minutes
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" /> 3
                      phone numbers
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" />{" "}
                      Premium conversational voices
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" />{" "}
                      Calendar & CRM Integrations
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="mr-3 h-5 w-5 text-primary" />{" "}
                      Priority 24/7 support
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/sign-up" className="w-full">
                    <Button className="w-full py-6 text-md font-medium">
                      Start 7-Day Trial
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="w-full py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg mx-auto">
                Got questions? We've got answers.
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <Accordion>
                <AccordionItem value="faq-1">
                  <AccordionTrigger className="text-left font-medium text-lg py-4">
                    Does the AI sound like a robot?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Not at all. We use the latest conversational AI models that
                    feature natural pauses, conversational fillers, and dynamic
                    intonation. Most callers cannot tell they are speaking with
                    software.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger className="text-left font-medium text-lg py-4">
                    Can I keep my existing phone number?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Yes! You can easily port your existing number to our
                    platform, or simply set up call forwarding from your current
                    provider to your new AI Receptionist number.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger className="text-left font-medium text-lg py-4">
                    How does appointment scheduling work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    The AI integrates directly with your Google Calendar,
                    Outlook, or scheduling tools like Calendly. It checks your
                    real-time availability and books appointments instantly
                    during the call.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger className="text-left font-medium text-lg py-4">
                    What happens if the AI doesn't know the answer?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    You can configure custom fallback rules. Usually, the AI
                    will politely inform the caller that it doesn't have that
                    specific information, and it will offer to take a message or
                    transfer the call to a human team member.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="w-full py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl mb-6">
              Ready to automate your business calls?
            </h2>
            <p className="max-w-[600px] text-primary-foreground/80 md:text-xl mx-auto mb-8">
              Join hundreds of businesses that use our AI to save time, reduce
              missed opportunities, and scale efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto font-semibold"
                >
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary"
                >
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AI Receptionist Inc. All rights
          reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-4"
            href="#"
          >
            Terms of Service
          </Link>
          <Link
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-4"
            href="#"
          >
            Privacy Policy
          </Link>
          <Link
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-4"
            href="#"
          >
            Contact Support
          </Link>
        </nav>
      </footer>
    </div>
  );
}
