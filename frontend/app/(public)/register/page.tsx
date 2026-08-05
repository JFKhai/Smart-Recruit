import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Briefcase, ArrowRight, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full">
          <Link href="/" className="inline-block mb-8">
            <Button variant="ghost" className="-ml-2 text-foreground/70">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-3">Choose Your Account Type</h1>
            <p className="text-lg text-foreground/70">
              Get started with Smart Recruit in just a few minutes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 border-2 border-border hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <Link href="/register/candidate" className="block h-full">
                <div className="mb-6 w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Find a Job</h2>
                <p className="text-foreground/70 mb-8">
                  I&apos;m looking for my next career opportunity. Get AI-powered job recommendations tailored to my profile.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    'Personalized job matches',
                    'Track applications easily',
                    'AI insights on every job',
                    'Interview notifications',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground/70">
                      <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-green-600 font-bold">✓</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button className="w-full group-hover:bg-primary/90" size="lg">
                  Sign Up as Candidate
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>

            <Card className="p-8 border-2 border-border hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <Link href="/register/employer" className="block h-full">
                <div className="mb-6 w-16 h-16 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Hire Talent</h2>
                <p className="text-foreground/70 mb-8">
                  I&apos;m hiring. Find and connect with pre-screened candidates matched to my job requirements.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    'AI-matched candidates',
                    'Post jobs in minutes',
                    'Manage applicants easily',
                    'Social media integration',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground/70">
                      <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-green-600 font-bold">✓</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button className="w-full group-hover:bg-primary/90" size="lg">
                  Sign Up as Employer
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>
          </div>

          <p className="text-center text-sm text-foreground/60 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
  )
}
