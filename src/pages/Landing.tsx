import Hero from "../components/hero/Hero";
import AgentCTA from "../components/sections/AgentCTA";
import ExploreAreas from "../components/sections/ExploreAreas";
import FeaturedProperties from "../components/sections/FeaturedProperties";
import Footer from "../components/sections/Footer";
import WhyDari from "../components/sections/WhyDari";
import HieroBackdrop from "../components/pharaonic/HieroBackdrop";

// NOTE: Navbar is rendered by MainLayout — do NOT add it here
export default function Landing() {
  return (
    <div className="pharaonic">
      <HieroBackdrop />
      <div className="relative z-10">
        <Hero />
        <ExploreAreas />
        <FeaturedProperties />
        <WhyDari />
        <AgentCTA />
        <Footer />
      </div>
    </div>
  );
}
