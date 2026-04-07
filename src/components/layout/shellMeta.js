const DEFAULT_META = Object.freeze({
  section: '',
  title: 'خانه',
  description: 'مهم ترین عملیات و ورودی های هر بخش را از اینجا دنبال کنید.',
})

const PAGE_META = [
  { match: (pathname) => pathname === '/', section: '', title: 'خانه', description: 'میانبرها، وضعیت های روزانه و ورود سریع به مسیرهای پرتکرار.' },
  { match: (pathname) => pathname === '/orders', section: '', title: 'سفارشات', description: 'ثبت، پیگیری، آرشیو و بررسی پرداخت سفارش ها در یک سطح کاری.' },
  { match: (pathname) => pathname === '/orders/new', section: '', title: 'سفارشات', description: 'جریان سریع ثبت سفارش با تمرکز روی کمترین جابه جایی اپراتور.' },
  { match: (pathname) => pathname.startsWith('/orders/'), section: '', title: 'سفارشات', description: 'وضعیت، اقلام، پیوست ها و پرداخت ها را در یک نما مدیریت کنید.' },
  { match: (pathname) => pathname === '/customers', section: '', title: 'مشتریان', description: 'جستجو، وضعیت، پروژه ها و اطلاعات تکمیلی مشتریان.' },
  { match: (pathname) => pathname === '/inventory', section: '', title: 'انبار', description: 'کاتالوگ، عملیات، موجودی و تنظیمات انبار با پیمایش چندسطحی.' },
  { match: (pathname) => pathname === '/accounting', section: '', title: 'حسابداری', description: 'اسناد، حساب ها، گزارش ها و تنظیمات در یک ساختار قابل پیش بینی.' },
  { match: (pathname) => pathname === '/human-resources', section: '', title: 'منابع انسانی', description: 'ثبت، آرشیو و مدیریت اطلاعات و مدارک پرسنل.' },
  { match: (pathname) => pathname.startsWith('/master-data/profile'), section: '', title: 'اطلاعات پایه', description: 'هویت برند و اطلاعات مرجع نمایش داده شده در سیستم را نگه دارید.' },
  { match: (pathname) => pathname.startsWith('/master-data/pricing'), section: '', title: 'اطلاعات پایه', description: 'قواعد قیمت، محدودیت ها و تنظیمات پایه فروش را مدیریت کنید.' },
  { match: (pathname) => pathname.startsWith('/master-data'), section: '', title: 'اطلاعات پایه', description: 'تنظیمات پایه ای که روی چندین ماژول اثر می گذارند.' },
  { match: (pathname) => pathname === '/users-access' || pathname === '/users', section: '', title: 'کاربران', description: 'نقش ها، مجوزها و وضعیت کاربران فعال سیستم.' },
  { match: (pathname) => pathname.startsWith('/management'), section: '', title: 'ممیزی فعالیت ها', description: 'ثبت رویدادها و تغییرات حساس را برای پیگیری بازبینی کنید.' },
  { match: (pathname) => pathname.startsWith('/owner'), section: '', title: 'اتاق فرمان', description: 'فعال سازی ماژول ها و تنظیمات سطح مالکیت سیستم.' },
]

export const getShellPageMeta = (pathname = '') => {
  const normalizedPath = String(pathname || '').trim()
  return PAGE_META.find((entry) => entry.match(normalizedPath)) || DEFAULT_META
}
