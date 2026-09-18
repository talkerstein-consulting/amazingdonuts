import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import './about.css';
import { BrandButton, SquircleDefs } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import { SHOP_HREF } from '../lib/shop-href';
import { BULK_HREF } from '../lib/routes';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';

export default function AboutPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div className="about-page">
          <Header onSignIn={() => setAuthOpen(true)} />
          <main>
            <section className="about-hero" aria-labelledby="about-title">
              <div className="about-hero__inner">
                <p className="about-eyebrow">Toronto-made since 1997</p>
                <p className="about-hero__line">Toronto's amazing donuts since 1997.</p>
                <h1 id="about-title">Amazing Donuts</h1>
              </div>
            </section>

            <section className="about-intro about-width" aria-labelledby="about-intro-title">
              <div className="about-intro__heading">
                <p className="about-eyebrow">Our story</p>
                <h2 id="about-intro-title">Made for sharing.</h2>
              </div>
              <div className="about-copy">
                <p>For nearly three decades, Amazing Donuts has been serving Toronto fresh donuts, muffins, cupcakes and baked goods made for sharing.</p>
                <p>Since 1997, we've been part of birthdays, school celebrations, family gatherings, Bar and Bat Mitzvahs, community events, office parties and everyday moments that deserve something sweet.</p>
                <p>What started as a local Toronto bakery has grown into a trusted name for fresh, kosher and allergy-conscious baked goods, while staying true to something simple: make great products, make them fresh and make them for everyone to enjoy.</p>
              </div>
            </section>

            <section className="about-fresh" aria-labelledby="about-fresh-title">
              <div className="about-width about-fresh__inner">
                <div className="about-fresh__photo">
                  <img src="/img/category/donuts.webp" alt="An assortment of Amazing Donuts" loading="lazy" />
                </div>
                <div className="about-fresh__copy about-copy">
                  <p className="about-eyebrow">Fresh from our bakery</p>
                  <h2 id="about-fresh-title">What makes Amazing Donuts special?</h2>
                  <p className="about-lead">A great donut doesn't need to be complicated.</p>
                  <p>Our donuts are known for their light, fluffy texture, fresh taste and classic flavours, from glazed and chocolate to sprinkles, filled donuts and seasonal favourites.</p>
                  <p>Everything is prepared with the same focus that has defined Amazing Donuts for years: quality, consistency and freshness.</p>
                  <p>Our products are freshly baked and prepared on site, whether you're stopping in for one donut, picking up a dozen for the family or ordering hundreds for a school, camp, business or special event.</p>
                  <p>But Amazing Donuts is about more than donuts.</p>
                  <p>Our bakery also makes muffins, cupcakes, cookies, breads, custom donuts and other baked goods, giving Toronto families and organizations an easy place to find treats for almost any occasion.</p>
                </div>
              </div>
            </section>

            <section className="about-welcome" aria-labelledby="about-welcome-title">
              <div className="about-width about-welcome__inner">
                <p className="about-eyebrow">A place at the table</p>
                <h2 id="about-welcome-title">Made so more people can enjoy them.</h2>
                <p className="about-welcome__lead">Food brings people together. We believe the treats on the table should too.</p>
                <div className="about-welcome__columns about-copy">
                  <div>
                    <p>Amazing Donuts has been a peanut-free, tree-nut-free and sesame-free bakery since 1997, with strict attention paid to how ingredients are sourced and products are handled.</p>
                    <p>That commitment has helped make Amazing Donuts a familiar choice for families, schools, camps, parties and community events where allergies matter.</p>
                  </div>
                  <div>
                    <p>We are also proudly certified kosher by the COR Kashrus Council of Canada. Our products are Pareve, Pas Yisroel and Kemach Yoshon.</p>
                    <p>For us, these aren't simply labels. They're part of our commitment to creating baked goods that more families and communities can feel comfortable bringing to the table.</p>
                  </div>
                </div>
                <a className="about-text-link" href="/allergy-free/">Allergy free <ArrowRight size={18} aria-hidden="true" /></a>
              </div>
            </section>

            <section className="about-moments about-width" aria-labelledby="about-moments-title">
              <div className="about-moments__copy about-copy">
                <p className="about-eyebrow">Shared moments</p>
                <h2 id="about-moments-title">Made for the moments that matter.</h2>
                <p>Some people remember Amazing Donuts from a birthday party.</p>
                <p>Others remember them from school, camp, Shabbat, a Bar or Bat Mitzvah, the office, or simply from grabbing a box on the way home.</p>
                <p>That's one of our favourite parts of what we do.</p>
              </div>
              <img src="/img/auth-donuts.jpg" alt="A colourful assortment of Amazing Donuts" loading="lazy" />
            </section>

            <section className="about-next" aria-labelledby="about-next-title">
              <div className="about-width about-next__inner">
                <p className="about-eyebrow">Since 1997 and counting</p>
                <h2 id="about-next-title">A Toronto tradition. A new chapter.</h2>
                <div className="about-next__columns about-copy">
                  <div>
                    <p>Amazing Donuts has changed over the years, but we haven't forgotten what made the bakery special in the first place.</p>
                    <p>When Amazing Donuts entered its next generation of ownership, the goal wasn't to replace its history. It was to protect what people already loved and build on it.</p>
                  </div>
                  <div>
                    <p>That means preserving the products, quality and community relationships that built the Amazing Donuts name while investing in the future: improving production, expanding our selection, making ordering more convenient and finding new ways to serve our customers.</p>
                    <p>The next chapter of Amazing Donuts is about bringing a Toronto favourite to more families, more schools, more businesses, more celebrations and more communities without losing the character that has kept customers coming back since 1997.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="about-ending about-width" aria-labelledby="about-ending-title">
              <p className="about-eyebrow">Why Amazing Donuts?</p>
              <h2 id="about-ending-title">The best things are pretty simple.</h2>
              <p>After nearly 30 years, we still believe it: bake it fresh. Make it delicious. Make it accessible. And make enough to share.</p>
              <p>That's Amazing Donuts. Toronto-made since 1997, and we're just getting started.</p>
              <div className="about-ending__action">
                <div>
                  <h3>Ready for something amazing?</h3>
                  <p>Explore our donuts, muffins, cupcakes and baked goods, create something custom for your next celebration, or place an order for pickup or delivery.</p>
                </div>
                <div className="about-ending__buttons">
                  <BrandButton href={SHOP_HREF}>Shop donuts</BrandButton>
                  <BrandButton href={BULK_HREF} variant="outline">Order custom treats</BrandButton>
                </div>
              </div>
            </section>
          </main>
          <Footer ready />
        </div>
        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
