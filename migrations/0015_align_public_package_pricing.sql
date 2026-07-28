-- Keep the operational catalog in sync with the public booking experience.
-- Amounts are integer USD cents and use the published launch-price schedule.
UPDATE rental_packages SET launch_price_cents=6900, standard_price_cents=7900, extra_week_price_cents=2500 WHERE id='pkg_quick_pack';
UPDATE rental_packages SET launch_price_cents=9900, standard_price_cents=10900, extra_week_price_cents=3500 WHERE id='pkg_apartment';
UPDATE rental_packages SET launch_price_cents=16900, standard_price_cents=18900, extra_week_price_cents=5500 WHERE id='pkg_home';
UPDATE rental_packages SET launch_price_cents=21900, standard_price_cents=25900, extra_week_price_cents=7500 WHERE id='pkg_large_home';
UPDATE rental_packages SET launch_price_cents=34900, standard_price_cents=39900, extra_week_price_cents=11000 WHERE id='pkg_estate_office';
