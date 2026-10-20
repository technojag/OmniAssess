import icon from '../assets/omniassess-icon.png'
import wordmarkLight from '../assets/omniassess-wordmark.svg'
import wordmarkDark from '../assets/omniassess-wordmark-dark.svg'

export default function Logo({ height = 40 }: { height?: number }) {
  return (
    <span role="img" aria-label="OmniAssess" className="inline-flex items-center gap-2">
      <img src={icon} alt="" style={{ height }} />
      <img src={wordmarkLight} alt="" className="theme-light-only" style={{ height: height * 0.6 }} />
      <img src={wordmarkDark} alt="" className="theme-dark-only" style={{ height: height * 0.6 }} />
    </span>
  )
}