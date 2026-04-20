import Link from 'next/link'
import ampLogoUrl from '../../src/assets/imgs/amp_logo.png'

export function MarketHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-wrap">
          <Link className="brand" href="/">
            <img src={ampLogoUrl.src} alt="AMP Logo" className="w-10" />
            <span>AMP Marketplace</span>
          </Link>
          <p className="brand-sub">Free + paid themes and plugins for AMP</p>
        </div>

        <nav className="topnav" aria-label="Marketplace navigation">
          <Link href="/">Browse</Link>
          <Link href="/?kind=theme">Themes</Link>
          <Link href="/?kind=plugin">Plugins</Link>
          <Link href="/submit">Submit</Link>
        </nav>
      </div>
    </header>
  )
}
