import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearIbgeLocationsCache,
  fetchIbgeCities,
  fetchIbgeStates,
} from "./ibge-locations";

const api = "https://servicodados.ibge.gov.br/api/v1/localidades";

function response(data: unknown, ok = true) {
  return { ok, json: async () => data };
}

beforeEach(() => {
  clearIbgeLocationsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  clearIbgeLocationsCache();
});

describe("fetchIbgeStates", () => {
  it("consulta estados por nome e mantém o resultado em cache", async () => {
    const states = [{ id: 26, sigla: "PE", nome: "Pernambuco" }];
    const fetchMock = vi.fn().mockResolvedValue(response(states));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchIbgeStates()).resolves.toEqual(states);
    await expect(fetchIbgeStates()).resolves.toEqual(states);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`${api}/estados?orderBy=nome`);
  });

  it("propaga erro quando a API de estados responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([], false)));

    await expect(fetchIbgeStates()).rejects.toThrow("Erro ao carregar estados");
  });

  it("atualiza o cache expirado", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([{ id: 1, sigla: "AC", nome: "Acre" }]))
      .mockResolvedValueOnce(response([{ id: 2, sigla: "AL", nome: "Alagoas" }]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchIbgeStates();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    await expect(fetchIbgeStates()).resolves.toEqual([
      { id: 2, sigla: "AL", nome: "Alagoas" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchIbgeCities", () => {
  it("consulta municípios por UF e mantém um cache separado por estado", async () => {
    const citiesByState = {
      PE: [{ id: 1, nome: "Recife" }],
      SP: [{ id: 2, nome: "São Paulo" }],
    };
    const fetchMock = vi.fn((url: string) => {
      const stateCode = url.includes("/PE/") ? "PE" : "SP";
      return Promise.resolve(response(citiesByState[stateCode as "PE" | "SP"]));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchIbgeCities("PE")).resolves.toEqual(citiesByState.PE);
    await expect(fetchIbgeCities("PE")).resolves.toEqual(citiesByState.PE);
    await expect(fetchIbgeCities("SP")).resolves.toEqual(citiesByState.SP);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${api}/estados/PE/municipios?orderBy=nome`);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${api}/estados/SP/municipios?orderBy=nome`);
  });

  it("atualiza apenas o cache do estado expirado", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([{ id: 1, nome: "Recife" }]))
      .mockResolvedValueOnce(response([{ id: 2, nome: "São Paulo" }]))
      .mockResolvedValueOnce(response([{ id: 3, nome: "Olinda" }]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchIbgeCities("PE");
    vi.advanceTimersByTime(1);
    await fetchIbgeCities("SP");
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 - 1);
    await expect(fetchIbgeCities("PE")).resolves.toEqual([{ id: 3, nome: "Olinda" }]);
    await expect(fetchIbgeCities("SP")).resolves.toEqual([{ id: 2, nome: "São Paulo" }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("propaga erro quando a API de municípios responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([], false)));

    await expect(fetchIbgeCities("PE")).rejects.toThrow("Erro ao carregar cidades");
  });
});
