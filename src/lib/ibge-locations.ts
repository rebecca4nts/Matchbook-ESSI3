export interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
}

export interface IbgeCity {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        id: number;
        sigla: string;
        nome: string;
      };
    };
  };
}

const IBGE_API = "https://servicodados.ibge.gov.br/api/v1/localidades";
const CACHE_TTL = 24 * 60 * 60 * 1000;

let statesCache: IbgeState[] | null = null;
let statesCacheTime = 0;
const citiesCache = new Map<string, { data: IbgeCity[]; time: number }>();

export async function fetchIbgeStates(): Promise<IbgeState[]> {
  if (statesCache && Date.now() - statesCacheTime < CACHE_TTL) {
    return statesCache;
  }
  const response = await fetch(`${IBGE_API}/estados?orderBy=nome`);
  if (!response.ok) throw new Error("Erro ao carregar estados");
  const data: IbgeState[] = await response.json();
  statesCache = data;
  statesCacheTime = Date.now();
  return data;
}

export async function fetchIbgeCities(stateCode: string): Promise<IbgeCity[]> {
  const cached = citiesCache.get(stateCode);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }
  const response = await fetch(`${IBGE_API}/estados/${stateCode}/municipios?orderBy=nome`);
  if (!response.ok) throw new Error("Erro ao carregar cidades");
  const data = await response.json();
  citiesCache.set(stateCode, { data, time: Date.now() });
  return data;
}

export function clearIbgeLocationsCache(): void {
  statesCache = null;
  statesCacheTime = 0;
  citiesCache.clear();
}
