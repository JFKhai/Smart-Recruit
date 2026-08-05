import React from 'react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="container-sr py-12">
        <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <p className="mb-3 text-lg font-bold tracking-tight text-foreground">
              Smart<span className="text-primary">Recruit</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Nền tảng tuyển dụng có AI matching — giúp ứng viên tìm việc phù hợp
              và nhà tuyển dụng chọn đúng người.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Ứng viên
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/jobs" className="transition-sr hover:text-primary">
                  Tìm việc làm
                </Link>
              </li>
              <li>
                <Link
                  href="/register/candidate"
                  className="transition-sr hover:text-primary"
                >
                  Tạo tài khoản
                </Link>
              </li>
              <li>
                <Link
                  href="/login?redirect=/candidate/cv"
                  className="transition-sr hover:text-primary"
                >
                  Quản lý CV
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Nhà tuyển dụng
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/register/employer"
                  className="transition-sr hover:text-primary"
                >
                  Đăng ký tuyển dụng
                </Link>
              </li>
              <li>
                <Link
                  href="/login?role=employer"
                  className="transition-sr hover:text-primary"
                >
                  Đăng nhập NTD
                </Link>
              </li>
              <li>
                <Link
                  href="/login?redirect=/employer/post-job"
                  className="transition-sr hover:text-primary"
                >
                  Đăng tin tuyển dụng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Liên hệ
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="cursor-default text-placeholder" title="Sắp ra mắt">
                  Về chúng tôi
                </span>
              </li>
              <li>
                <span className="cursor-default text-placeholder" title="Sắp ra mắt">
                  Điều khoản
                </span>
              </li>
              <li>
                <span className="cursor-default text-placeholder" title="Sắp ra mắt">
                  Chính sách bảo mật
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Smart Recruit. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
