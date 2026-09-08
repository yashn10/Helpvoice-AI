import { Injectable, inject } from '@angular/core';
import { AuthService, EmergencyContact } from './auth.service';

export interface VoiceCallMatch {
  matched: boolean;
  targetName?: string;
  phoneNumber?: string;
  serviceType?: string;
  spokenPrompt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceDialerService {
  private authService = inject(AuthService);

  /**
   * Evaluates spoken transcript for direct voice dialing intent
   */
  public evaluateVoiceCallIntent(rawTranscript: string): VoiceCallMatch {
    const text = (rawTranscript || '').toLowerCase().trim();
    if (!text) return { matched: false };

    // 1. Check for Public Emergency Numbers & Services
    // Police (100)
    if (
      this.containsAny(text, [
        'call police',
        'dial police',
        'phone police',
        'police ko call',
        'police ko phone',
        'police bulao',
        'call 100',
        'dial 100',
        'पोलीस',
        'पुलिस',
      ])
    ) {
      return {
        matched: true,
        targetName: 'Police Control Room',
        phoneNumber: '100',
        serviceType: 'police',
        spokenPrompt: 'Calling Police Control Room on 100.',
      };
    }

    // Fire (101)
    if (
      this.containsAny(text, [
        'call fire',
        'dial fire',
        'fire brigade',
        'call 101',
        'dial 101',
        'aag lagi hai',
        'aag lag gayi',
        'fire engine',
        'दमकल',
        'फायर',
      ])
    ) {
      return {
        matched: true,
        targetName: 'Fire & Rescue Emergency',
        phoneNumber: '101',
        serviceType: 'fire',
        spokenPrompt: 'Calling Fire and Rescue Department on 101.',
      };
    }

    // Ambulance (108)
    if (
      this.containsAny(text, [
        'call ambulance',
        'dial ambulance',
        'call 108',
        'dial 108',
        'call 102',
        'dial 102',
        'ambulance bulao',
        'ambulance ko call',
        'एम्बुलेंस',
        'रुग्णवाहिका',
      ])
    ) {
      return {
        matched: true,
        targetName: 'Ambulance Emergency (108)',
        phoneNumber: '108',
        serviceType: 'ambulance',
        spokenPrompt: 'Calling Ambulance Medical Services on 108.',
      };
    }

    // National Emergency (112)
    if (
      this.containsAny(text, [
        'call 112',
        'dial 112',
        'call emergency',
        'emergency call',
        'sos call',
        'call national emergency',
      ])
    ) {
      return {
        matched: true,
        targetName: 'National SOS Emergency (112)',
        phoneNumber: '112',
        serviceType: 'sos',
        spokenPrompt: 'Calling National Emergency 112.',
      };
    }

    // Women Helpline (1091)
    if (
      this.containsAny(text, [
        'call 1091',
        'dial 1091',
        'women helpline',
        'mahila helpline',
        'महिला हेल्पलाइन',
      ])
    ) {
      return {
        matched: true,
        targetName: 'Women Helpline (1091)',
        phoneNumber: '1091',
        serviceType: 'women',
        spokenPrompt: 'Calling Women Safety Helpline on 1091.',
      };
    }

    // 2. Check Custom User Emergency Contacts (Family, Friends, Doctor, etc.)
    const contacts = this.authService.emergencyContacts();
    const callTriggers = ['call', 'dial', 'phone', 'ring', 'कॉल', 'फोन', 'लगाओ', 'मिलाओ', 'बोलो', 'lava', 'lagao'];

    for (const contact of contacts) {
      const name = contact.name.toLowerCase().trim();
      const relation = (contact.relation || '').toLowerCase().trim();

      // Direct full match (e.g. "call Papa", "phone Mom", "call Rahul")
      const matchesName = text.includes(name);
      const matchesRelation = relation.length > 2 && text.includes(relation);

      // Alias mapping for common relations
      const isFather = (relation.includes('father') || name.includes('father') || name.includes('papa') || name.includes('dad')) &&
        (text.includes('papa') || text.includes('dad') || text.includes('father') || text.includes('pitaji') || text.includes('baba') || text.includes('पप्पा') || text.includes('बाबा'));

      const isMother = (relation.includes('mother') || name.includes('mother') || name.includes('mom') || name.includes('mummy') || name.includes('aai')) &&
        (text.includes('mom') || text.includes('mummy') || text.includes('mother') || text.includes('mataji') || text.includes('aai') || text.includes('आई') || text.includes('मम्मी'));

      const isDoctor = (relation.includes('doc') || name.includes('doc')) &&
        (text.includes('doctor') || text.includes('dr') || text.includes('डॉक्टर'));

      if (matchesName || matchesRelation || isFather || isMother || isDoctor) {
        // Confirm there is an intention to call or name presence
        return {
          matched: true,
          targetName: `${contact.name} (${contact.relation || 'Emergency Contact'})`,
          phoneNumber: contact.phone,
          serviceType: 'contact',
          spokenPrompt: `Calling ${contact.name} at ${contact.phone}.`,
        };
      }
    }

    return { matched: false };
  }

  private containsAny(text: string, phrases: string[]): boolean {
    return phrases.some((p) => text.includes(p));
  }
}
