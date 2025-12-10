/**
 * Registro de todas las plataformas soportadas
 * Este archivo inicializa y registra todas las plataformas en el PlatformService
 */

import { platformService } from './PlatformService';
import { YouTubePlatform } from './youtube';
import { TikTokPlatform } from './tiktok/TikTokPlatform';
import { TwitterPlatform } from './twitter/TwitterPlatform';
import { RedditPlatform } from './reddit/RedditPlatform';
import { TwitchPlatform } from './twitch/TwitchPlatform';
import { FacebookPlatform } from './facebook/FacebookPlatform';
import { InstagramPlatform } from './instagram/InstagramPlatform';

/**
 * Inicializar y registrar todas las plataformas
 */
export function registerAllPlatforms(): void {
  console.log('Registering all platforms...');

  // BLOQUE 1: YouTube (ACTIVO)
  try {
    const youtube = new YouTubePlatform();
    platformService.register(youtube);
  } catch (error) {
    console.error('Failed to register YouTube:', error);
  }

  // BLOQUE 2: TikTok (ACTIVO)
  try {
    const tiktok = new TikTokPlatform();
    platformService.register(tiktok);
    console.log('✅ TikTok platform registered');
  } catch (error) {
    console.error('❌ Failed to register TikTok:', error);
  }

  // BLOQUE 3: Twitter/X (ACTIVO)
  try {
    const twitter = new TwitterPlatform();
    platformService.register(twitter);
    console.log('✅ Twitter/X platform registered');
  } catch (error) {
    console.error('❌ Failed to register Twitter:', error);
  }

  // BLOQUE 4: Reddit (ACTIVO)
  try {
    const reddit = new RedditPlatform();
    platformService.register(reddit);
    console.log('✅ Reddit platform registered');
  } catch (error) {
    console.error('❌ Failed to register Reddit:', error);
  }

  // BLOQUE 5: Twitch (ACTIVO)
  try {
    const twitch = new TwitchPlatform();
    platformService.register(twitch);
    console.log('✅ Twitch platform registered');
  } catch (error) {
    console.error('❌ Failed to register Twitch:', error);
  }

  // BLOQUE 6: Facebook (ACTIVO)
  try {
    const facebook = new FacebookPlatform();
    platformService.register(facebook);
    console.log('✅ Facebook platform registered');
  } catch (error) {
    console.error('❌ Failed to register Facebook:', error);
  }

  // BLOQUE 7: Instagram (ACTIVO)
  try {
    const instagram = new InstagramPlatform();
    platformService.register(instagram);
    console.log('✅ Instagram platform registered');
  } catch (error) {
    console.error('❌ Failed to register Instagram:', error);
  }

  console.log(`✅ Platform registration complete. Total platforms: ${platformService.getAllPlatforms().length}`);
  console.log('📊 Platform summary:', platformService.getSummary());
}

// Auto-register cuando se importa este módulo
if (typeof window !== 'undefined') {
  registerAllPlatforms();
}
