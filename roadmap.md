# Roadmap

- [x] Remove the search (magnifying glass) icon from the header on every page
- [x] Remove the "Cabelo, Pele e Unha" category block the user marked on the home page
- [x] Remove the three promo banners from the mobile menu drawer
- [x] Free shipping threshold changed from R$199 to R$97 (pages, cart rules, tests)
- [ ] Confirm with the user whether the coral "2 Pacotes" card outline should also become blue
- [x] Vega Pix checkout built in the cart (form, CEP autofill, QR code screen, tests)
- [x] Vega key and domain (patchsleep.shop) saved; orders go through checkout.patchsleep.shop and pass Vega's domain check
- [x] Vega integration removed (API route, secrets, card redirect); checkout runs fully on the site
- [x] Card fields (number, name, expiry, CVV, installments) on the checkout payment step
- [ ] Connect the payment gateway (Pix + card) to /api/public/payment — waiting on the user's gateway details
- [x] Project is on GitHub, public: https://github.com/projetoslovable2027-web/sleep-patch-manager (262 files, contents verified identical to the project)
- [x] Own checkout page /checkout (Identificação → Entrega → Pagamento Pix + resumo) in the store's design, replacing the Vega-link idea
