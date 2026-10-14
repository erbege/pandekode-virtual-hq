import React from 'react';
import { EffectComposer, Bloom, SSAO, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';

/**
 * PostProcessingEffects
 * Pipeline efek visual sinematik untuk Virtual Office PANDEKODE HQ:
 * 1. SSAO (Screen Space Ambient Occlusion) - Bayangan kontak realistis di celah & sudut objek.
 * 2. Bloom - Efek glow berpijar pada lampu, layar monitor/laptop, dan material emissive.
 *    Menggunakan dual-layer bloom: low threshold untuk soft glow + high threshold untuk bright highlight.
 * 3. ToneMapping - ACES Filmic untuk koreksi warna dinamis dan gradasi sinematik layaknya film.
 * 4. Vignette - Gradasi gelap halus di sudut layar untuk kedalaman fokus visual.
 *
 * @param {boolean} isNight - Jika true, efek bloom & vignette diperkuat untuk suasana malam.
 */
export const PostProcessingEffects = ({ 
  bloom = true, 
  ssao = true, 
  vignette = true, 
  toneMapping = true,
  isNight = false
}) => {
  const anyEnabled = bloom || ssao || vignette || toneMapping;
  if (!anyEnabled) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass>
      {/* 1. SSAO - Screen Space Ambient Occlusion untuk kontak bayangan sudut & celah */}
      {ssao && (
        <SSAO
          intensity={15}
          radius={0.3}
          luminanceInfluence={0.6}
          color="black"
        />
      )}

      {/* 2. Bloom - Glow effect seimbang, tidak menyilaukan di siang hari */}
      {bloom && (
        <Bloom
          intensity={isNight ? 0.75 : 0.32}
          luminanceThreshold={isNight ? 0.88 : 0.96}
          luminanceSmoothing={0.25}
          mipmapBlur
          radius={0.65}
        />
      )}

      {/* 3. ToneMapping - ACES Filmic warna sinematik */}
      {toneMapping && (
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      )}

      {/* 4. Vignette - Efek gelap di pinggir layar, lebih kuat saat malam */}
      {vignette && (
        <Vignette
          offset={isNight ? 0.35 : 0.25}
          darkness={isNight ? 0.72 : 0.45}
          blendFunction={BlendFunction.NORMAL}
          eskil={false}
        />
      )}
    </EffectComposer>
  );
};

export default React.memo(PostProcessingEffects);
