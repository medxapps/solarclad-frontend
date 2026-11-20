// BIPV Physics Simulation Engine (Ported from Python to JavaScript)

export const DEFAULT_BIPV_SPECS = {
    spandrel:     { wp_per_m2: 165.0, noct: 54.0, temp_coeff: -0.0038, iam_b0: 0.05, mismatch_factor: 0.92, soiling_factor: 0.96 },
    vision_glass: { wp_per_m2: 75.0,  noct: 50.0, temp_coeff: -0.0028, iam_b0: 0.08, mismatch_factor: 0.90, soiling_factor: 0.95 },
    balustrade:   { wp_per_m2: 135.0, noct: 45.0, temp_coeff: -0.0038, iam_b0: 0.05, mismatch_factor: 0.85, soiling_factor: 0.94 },
    roof_panel:   { wp_per_m2: 210.0, noct: 46.0, temp_coeff: -0.0036, iam_b0: 0.04, mismatch_factor: 0.96, soiling_factor: 0.97 }
};

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function solarVectorEnu(latDeg, lonDeg, stdMeridianDeg, dayOfYear, hourLocal) {
    const phi = toRadians(latDeg);
    const delta = toRadians(23.45 * Math.sin(toRadians(360.0 / 365.0 * (284 + dayOfYear))));

    const B = toRadians(360.0 / 365.0 * (dayOfYear - 81));
    const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const solarTime = hourLocal + (4.0 * (lonDeg - stdMeridianDeg) + eotMin) / 60.0;
    const omega = toRadians(15.0 * (solarTime - 12.0));

    const sinAlpha = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
    if (sinAlpha <= 0) return [0.0, 0.0, -1.0];

    const alpha = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlpha)));
    let cosGamma = (Math.sin(delta) * Math.cos(phi) - Math.cos(delta) * Math.sin(phi) * Math.cos(omega)) / Math.cos(alpha);
    let gamma = Math.acos(Math.max(-1.0, Math.min(1.0, cosGamma)));
    if (omega > 0) {
        gamma = 2 * Math.PI - gamma;
    }

    return [
        Math.cos(alpha) * Math.sin(gamma), // East
        Math.cos(alpha) * Math.cos(gamma), // North
        Math.sin(alpha)                    // Up
    ];
}

function dotProduct(v1, v2) {
    return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
}

export function simulateSocietyBipvYield(latDeg, lonDeg, stdMeridianDeg, patches, bipvSpecs, weatherRecords, albedo = 0.20, inverterEff = 0.96, dtHours = 1.0) {
    let energyKwhByType = { total_society_kwh: 0.0 };
    Object.keys(bipvSpecs).forEach(cat => energyKwhByType[cat] = 0.0);

    if (!patches || patches.length === 0) return energyKwhByType;

    // Pre-calculate normals for all patches
    patches.forEach(p => {
        const b = toRadians(p.tilt_deg);
        const g = toRadians(p.azimuth_deg);
        p.normal = [Math.sin(b) * Math.sin(g), Math.sin(b) * Math.cos(g), Math.cos(b)];
    });

    weatherRecords.forEach(w => {
        const sunVec = solarVectorEnu(latDeg, lonDeg, stdMeridianDeg, w.doy, w.hour);
        if (sunVec[2] <= 0) return; // Nighttime

        patches.forEach(patch => {
            const spec = bipvSpecs[patch.category];
            if (!spec) return;

            const cTheta = Math.max(0.0, dotProduct(patch.normal, sunVec));

            let sBeam = 0.0;
            let iamBeam = 0.0;

            if (cTheta > 0.05) {
                // Mock Raycaster (TODO: hook into Three.js scene rays for actual occlusion)
                const isShaded = sunVec[2] < 0.3 ? true : false;
                sBeam = isShaded ? 0.0 : 1.0;
                iamBeam = Math.max(0.0, 1.0 - spec.iam_b0 * (1.0 / cTheta - 1.0));
            }

            const gBeam = w.dni * cTheta * sBeam * iamBeam;

            const iamDiffuse = 1.0 - spec.iam_b0 * 0.55;
            const gDiffuse = w.dhi * patch.svf * iamDiffuse;

            const groundVf = (1.0 - Math.cos(toRadians(patch.tilt_deg))) / 2.0;
            const gReflected = w.ghi * albedo * groundVf * iamDiffuse;

            const gEff = gBeam + gDiffuse + gReflected;
            if (gEff <= 0) return;

            const tCell = w.t_amb + ((spec.noct - 20.0) / 800.0) * gEff;
            const tempFactor = Math.max(0.5, 1.0 + spec.temp_coeff * (tCell - 25.0));

            const pDcWatts = patch.area_m2 * spec.wp_per_m2 * (gEff / 1000.0) * tempFactor * spec.soiling_factor * spec.mismatch_factor;

            const yieldKwh = (pDcWatts * inverterEff * dtHours) / 1000.0;
            energyKwhByType[patch.category] += yieldKwh;
            energyKwhByType.total_society_kwh += yieldKwh;
        });
    });

    return energyKwhByType;
}