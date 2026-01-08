-- Migration: 018_seed_test_standards
-- Description: Seed initial test standards data (IEC/UL standards)

-- =====================================================
-- SEED DATA - TEST STANDARDS
-- =====================================================

INSERT INTO test_standards (standard_code, name, version, description, category, duration_days) VALUES
('IEC 61215', 'Crystalline Silicon Terrestrial Photovoltaic (PV) Modules - Design Qualification and Type Approval', '2021', 'Performance and reliability testing for crystalline silicon PV modules', 'performance', 90),
('IEC 61730', 'Photovoltaic (PV) Module Safety Qualification', '2016', 'Safety requirements for PV modules', 'safety', 60),
('IEC 62716', 'Photovoltaic (PV) Modules - Ammonia Corrosion Testing', '2013', 'Testing for ammonia resistance in agricultural environments', 'environmental', 30),
('IEC 61701', 'Salt Mist Corrosion Testing of Photovoltaic (PV) Modules', '2020', 'Testing for salt mist resistance in coastal environments', 'environmental', 21),
('IEC 62804', 'Photovoltaic (PV) Modules - Test Methods for the Detection of Potential-Induced Degradation', '2015', 'PID testing for system voltage stress', 'durability', 14),
('UL 1703', 'Flat-Plate Photovoltaic Modules and Panels', '2020', 'US safety standard for PV modules', 'safety', 45),
('IEC 61853', 'Photovoltaic (PV) Module Performance Testing and Energy Rating', '2018', 'Performance characterization under various conditions', 'performance', 30),
('IEC 62892', 'Extended Thermal Cycling of Crystalline Silicon PV Modules', '2019', 'Extended thermal cycling for enhanced reliability', 'durability', 60)
ON CONFLICT (standard_code) DO NOTHING;
