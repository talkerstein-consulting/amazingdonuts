import Wedge from "./Wedge.jsx";
import { CATEGORIES, FAMILIES, categoryFace, inCategory } from "../lib/catalogue.js";

const CERTS = [
  {
    family: "sky",
    img: "/assets/badge-kosher-cor.webp",
    alt: "COR kosher certification",
    title: "Kosher COR 483",
    body: "Pareve, Pas Yisroel, Kemach Yoshon, certified by the Kashruth Council of Canada. The box goes on any table without a phone call first."
  },
  {
    family: "magenta",
    img: "/assets/badge-allergy-free.webp",
    alt: "Allergy free certification",
    title: "Nut free, whole building",
    body: "No tree nuts, no peanuts, no sesame — nothing containing them comes through the door. Recognized under the Anaphylaxis Network."
  },
  {
    family: "sunshine",
    img: "/assets/badge-dairy-free.webp",
    alt: "Dairy free certification",
    title: "Dairy free, always",
    body: "Everything we bake is pareve, so dessert works after a meat meal and after a dairy one. No two versions, no second box."
  }
];

const EXCUSES = [
  {
    family: "sky",
    rank: "Holds up perfectly",
    title: "It is somebody's birthday.",
    body: "Twenty-eight years of birthdays, and nobody has once asked us to justify the box."
  },
  {
    family: "magenta",
    rank: "Holds up well",
    title: "The team had a rough week.",
    body: "Forty-five dollars of printed donuts has rescued more Monday meetings than any offsite we have heard about."
  },
  {
    family: "sunshine",
    rank: "Not an excuse — a duty",
    title: "It is Friday and there is challah.",
    body: "Six-braid, baked Friday only, $9. Gone by early afternoon, every week."
  }
];

export function Certifications() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section__head">
          <p className="eyebrow">Why people drive across the city for this</p>
          <h2 className="display">Three certificates that let you stop reading labels.</h2>
        </div>
        <div className="washes">
          {CERTS.map((c) => (
            <div className="wash" data-family={c.family} key={c.title}>
              <img src={c.img} alt={c.alt} />
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 3-up grid: shift one family per row so no tile touches its own colour.
    Grounds stay transparent until hover. */
export function Categories() {
  return (
    <section className="section" id="counter">
      <div className="wrap">
        <div className="section__head">
          <p className="eyebrow">The whole counter</p>
          <h2 className="display">Sixty things. Six shelves. One line-up.</h2>
        </div>
        <div className="cats">
          {CATEGORIES.map((c, i) => {
            const face = categoryFace(c.id);
            const count = inCategory(c.id).length;
            return (
              <a
                className="cat"
                key={c.id}
                href="#build"
                data-family={FAMILIES[(i + Math.floor(i / 3)) % 3]}
              >
                <span className="cat__ground" />
                {face ? <img src={"/" + face.img} alt="" loading="lazy" /> : null}
                <span>
                  <span className="cat__name">{c.label}</span>
                  <span className="cat__count">{count} to choose from</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CustomPrint() {
  return (
    <section className="section section--cream" id="printing">
      <div className="wrap split">
        <div className="split__art">
          <div className="split__frame">
            <img
              src="/assets/photos/donut-custom-printed-twelve.webp"
              alt="A dozen donuts printed with a custom design"
              loading="lazy"
            />
          </div>
        </div>
        <div>
          <p className="eyebrow">Bring us your artwork</p>
          <h2 className="display">A dozen donuts with your logo on them. $45.</h2>
          <p className="split__body">
            Send a file — a company mark, a photo, a five-year-old&rsquo;s drawing — and we print it
            edible and set it on our own donuts or cupcakes. It costs less than the coffee for the
            same meeting, and people photograph it before they eat it.
          </p>
          <ul className="ticks">
            <li>Twelve custom printed donuts — $45.00</li>
            <li>Twelve custom printed cupcakes — $45.00</li>
            <li>Letter and number donut cakes — from $35.00</li>
            <li>Petite donuts for a crowd, from 75 pieces</li>
          </ul>
          <Wedge label="Call About Printing" href="tel:+14163987546" family="magenta" biteBg="var(--cream)" />
        </div>
      </div>
    </section>
  );
}

export function Excuses() {
  return (
    <section className="section section--sky">
      <div className="wrap">
        <div className="section__head">
          <p className="eyebrow">Occasions, reviewed</p>
          <h2 className="display">Reasons to buy a dozen, ranked by how well they hold up.</h2>
        </div>
        <div className="excuses">
          {EXCUSES.map((e) => (
            <div className="excuse" data-family={e.family} key={e.title}>
              <span className="excuse__ground" />
              <span className="excuse__no">{e.rank}</span>
              <h3>{e.title}</h3>
              <p>{e.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InkPanel() {
  return (
    <section className="section section--ink" id="bakery">
      <div className="wrap inkpanel">
        <img src="/assets/logo-amazing-donuts.webp" alt="Amazing Donuts" />
        <div>
          <h2 className="display">Baked here. Every morning. Since 1997.</h2>
          <p>
            We built a bakery a family with severe allergies can walk into without a conversation
            first. Nothing containing tree nuts, peanuts or sesame comes through the door, so there
            is no shared equipment to ask about and no ingredient list to squint at.
          </p>
          <p>
            Everything is mixed, fried and finished on site the morning you buy it. That is also why
            we close early on Friday and stay shut on Saturday.
          </p>
          <ul className="ticks" style={{ marginTop: 26 }}>
            <li>Baked on site, every day we are open</li>
            <li>Pareve — one box works after any meal</li>
            <li>Recognized under the Anaphylaxis Network</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Visit() {
  return (
    <section className="section" id="visit">
      <div className="wrap">
        <div className="section__head">
          <p className="eyebrow">Come by</p>
          <h2 className="display">Nourishing Toronto, one bite at a time.</h2>
        </div>
        <div className="visit">
          <div className="visit__block" data-family="sky">
            <h3>The bakery</h3>
            <p>
              3499 Bathurst Street
              <br />
              Toronto, Ontario
            </p>
          </div>
          <div className="visit__block" data-family="magenta">
            <h3>Talk to us</h3>
            <p>
              <a href="tel:+14163987546">(416) 398-7546</a>
              <br />
              <a href="mailto:orders@amazingdonuts.com">orders@amazingdonuts.com</a>
            </p>
          </div>
          <div className="visit__block" data-family="sunshine">
            <h3>Hours</h3>
            <dl className="hours">
              <div>
                <dt>Sun</dt>
                <dd>8:00am – 1:00pm</dd>
              </div>
              <div>
                <dt>Mon – Thu</dt>
                <dd>7:30am – 4:00pm</dd>
              </div>
              <div>
                <dt>Fri</dt>
                <dd>7:30am – 1:00pm</dd>
              </div>
              <div>
                <dt>Sat</dt>
                <dd className="closed">Closed</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__in">
          <div>
            <img className="mark" src="/assets/logo-amazing-donuts.webp" alt="Amazing Donuts" />
            <p style={{ color: "#A9C3D0", fontSize: 16 }}>
              Kosher pareve · Nut, peanut and sesame free · Baked on site at 3499 Bathurst Street.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <a href="#build">{c.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Bakery</h4>
            <ul>
              <li>
                <a href="#bakery">Our Bakery</a>
              </li>
              <li>
                <a href="#bakery">Kashruth</a>
              </li>
              <li>
                <a href="#bakery">Allergy Policy</a>
              </li>
              <li>
                <a href="#visit">Visit &amp; Hours</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Find us</h4>
            <ul>
              <li>
                3499 Bathurst Street
                <br />
                Toronto, Ontario
              </li>
              <li>
                <a href="tel:+14163987546">(416) 398-7546</a>
              </li>
              <li>
                <a href="mailto:orders@amazingdonuts.com">orders@amazingdonuts.com</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot__base">
          <span>© {new Date().getFullYear()} Amazing Donuts. All rights reserved.</span>
          <span>Certified kosher by COR 483 — pareve, Pas Yisroel, Kemach Yoshon.</span>
        </div>
      </div>
    </footer>
  );
}
