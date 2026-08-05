import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Zap,
  BarChart3,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">

          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Find Your Perfect Job Match with AI
          </h1>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto mb-10">
            Smart Recruit uses advanced AI algorithms to connect you with jobs that match your skills, experience, and career goals. Say goodbye to endless scrolling.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/register">
                Get Started as Candidate
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">For Employers</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Why Choose Smart Recruit?</h2>
            <p className="text-xl text-foreground/70">Experience the power of AI-driven job matching</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Job Recommendations</h3>
              <p className="text-foreground/70">
                Get personalized job recommendations based on your skills, experience, and career preferences. No more irrelevant applications.
              </p>
            </Card>

            <Card className="p-8 border border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Match Transparency</h3>
              <p className="text-foreground/70">
                Understand exactly how well you match each job with our clear match score and insights on your relevant skills.
              </p>
            </Card>

            <Card className="p-8 border border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">For Employers</h3>
              <p className="text-foreground/70">
                Find the perfect candidates quickly. Our AI matches your job requirements with qualified professionals automatically.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-foreground/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Sign Up & Build Profile',
                  description: 'Create your account and upload your resume. Our AI analyzes your skills.',
                },
                {
                  step: 2,
                  title: 'Get AI Matches',
                  description:
                    'Receive daily personalized job recommendations matched to your profile.',
                },
                {
                  step: 3,
                  title: 'Apply with Insights',
                  description:
                    'See match scores and AI insights before applying. Apply with confidence.',
                },
                {
                  step: 4,
                  title: 'Track Applications',
                  description: 'Monitor your applications and interview status in one dashboard.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{item.step}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-foreground/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-foreground/5 rounded-xl aspect-square flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                <p className="text-foreground/40">How Smart Recruit Works</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Find Your Dream Job?</h2>
          <p className="text-lg text-white/80 mb-10">
            Join thousands of professionals using Smart Recruit to land their perfect role.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/register">Start Your Journey</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10"
            >
              <Link href="/register">For Employers</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Trusted by Professionals</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'Smart Recruit helped me find a job in just 2 weeks. The AI recommendations were spot on!',
                author: 'Sarah Chen',
                role: 'Senior React Developer',
              },
              {
                quote:
                  'As an employer, the quality of AI-matched candidates is exceptional. We hired our best engineer through Smart Recruit.',
                author: 'John Smith',
                role: 'Hiring Manager, TechCorp',
              },
              {
                quote:
                  'No more endless job searching. The match scores saved me so much time. Highly recommended!',
                author: 'Emily Rodriguez',
                role: 'Full Stack Developer',
              },
            ].map((testimonial) => (
              <Card key={testimonial.author} className="p-8 border border-border">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-lg">
                      ⭐
                    </span>
                  ))}
                </div>
                <p className="text-foreground/70 mb-6 italic">{testimonial.quote}</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.author}</p>
                  <p className="text-sm text-foreground/60">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
