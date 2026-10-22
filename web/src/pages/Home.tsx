import BenefitsStrip from '../components/BenefitsStrip'
import Footer from '../components/Footer'
import Header from '../components/Header'
import HeroCarousel from '../components/HeroCarousel'
import { AfterExam, Faq, HowItWorks, Improve, RealExam } from '../components/HomeSections'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroCarousel />
        <BenefitsStrip />
        <HowItWorks />
        <RealExam />
        <AfterExam />
        <Improve />
        <Faq />
      </main>
      <Footer />
    </>
  )
}