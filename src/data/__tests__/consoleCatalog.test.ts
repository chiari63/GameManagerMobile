import { CONSOLE_BRANDS, CONSOLE_MODELS_BY_BRAND } from '../consoleCatalog';

describe('catálogo de consoles', () => {
  it('inclui fabricantes brasileiros históricos que estavam ausentes', () => {
    expect(CONSOLE_BRANDS).toEqual(expect.arrayContaining([
      'Philco-Ford',
      'Sharp',
      'Bit Eletrônica',
      'Sayi Eletrônica',
      'Dismac',
    ]));
  });

  it('oferece modelos brasileiros verificáveis para seleção', () => {
    expect(CONSOLE_MODELS_BY_BRAND['Philco-Ford']).toEqual(expect.arrayContaining(['Telejogo', 'Telejogo II']));
    expect(CONSOLE_MODELS_BY_BRAND['Sharp']).toEqual(expect.arrayContaining(['Digiplay']));
    expect(CONSOLE_MODELS_BY_BRAND['CCE']).toEqual(expect.arrayContaining(['Supergame VG-5600']));
    expect(CONSOLE_MODELS_BY_BRAND['Dismac']).toEqual(expect.arrayContaining(['VJ 8900', 'VJ 9000', 'VJ 9100', 'Bit System']));
    expect(CONSOLE_MODELS_BY_BRAND['Sayi Eletrônica']).toEqual(expect.arrayContaining(['Dactari']));
    expect(CONSOLE_MODELS_BY_BRAND['Tectoy']).toEqual(expect.arrayContaining(['Master System Handy', 'Master System 3 Collection', 'Mega Drive 4']));
    expect(CONSOLE_MODELS_BY_BRAND['Dynacom']).toEqual(expect.arrayContaining(['MegaBoy']));
    expect(CONSOLE_MODELS_BY_BRAND['IBTC']).toEqual(expect.arrayContaining(['Super Charger']));
    expect(CONSOLE_MODELS_BY_BRAND['Geniecom']).toEqual(expect.arrayContaining(['Geniecom']));
    expect(CONSOLE_MODELS_BY_BRAND['Chips do Brasil']).toEqual(expect.arrayContaining(['ProSystem-8']));
  });

  it('mantém cada marca disponível com ao menos um modelo', () => {
    for (const brand of CONSOLE_BRANDS) {
      expect(CONSOLE_MODELS_BY_BRAND[brand].length).toBeGreaterThan(0);
    }
  });
});
