"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Location {
  city: string;
  state: string;
  stateCode: string;
}

interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeCity {
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

async function fetchStates(): Promise<IbgeState[]> {
  if (statesCache && Date.now() - statesCacheTime < CACHE_TTL) {
    return statesCache;
  }
  const res = await fetch(`${IBGE_API}/estados?orderBy=nome`);
  if (!res.ok) throw new Error("Erro ao carregar estados");
  statesCache = await res.json();
  statesCacheTime = Date.now();
  return statesCache!;
}

async function fetchCitiesByState(stateCode: string): Promise<IbgeCity[]> {
  const cached = citiesCache.get(stateCode);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }
  const res = await fetch(`${IBGE_API}/estados/${stateCode}/municipios?orderBy=nome`);
  if (!res.ok) throw new Error("Erro ao carregar cidades");
  const data = await res.json();
  citiesCache.set(stateCode, { data, time: Date.now() });
  return data;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface LocationInputProps {
  value: string;
  onChange: (value: string, location?: Location) => void;
  required?: boolean;
}

export default function LocationInput({ value, onChange, required }: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const normalizedQuery = normalize(searchQuery);

    try {
      const states = await fetchStates();
      const matchedStates = states.filter((s) =>
        normalize(s.nome).includes(normalizedQuery) || normalize(s.sigla).includes(normalizedQuery)
      );

      const locations: Location[] = [];

      for (const state of matchedStates.slice(0, 3)) {
        const cities = await fetchCitiesByState(state.sigla);
        for (const city of cities.slice(0, 5)) {
          locations.push({
            city: city.nome,
            state: state.nome,
            stateCode: state.sigla,
          });
        }
      }

      if (locations.length < 10) {
        const loadedStates = new Set(matchedStates.map((s) => s.sigla));
        const allStates = states.filter((s) => !loadedStates.has(s.sigla));

        for (const state of allStates) {
          if (locations.length >= 10) break;
          const cities = await fetchCitiesByState(state.sigla);
          const matchedCities = cities.filter((c) => normalize(c.nome).includes(normalizedQuery));
          for (const city of matchedCities) {
            if (locations.length >= 10) break;
            locations.push({
              city: city.nome,
              state: state.nome,
              stateCode: state.sigla,
            });
          }
        }
      }

      setResults(locations.slice(0, 10));
      setIsOpen(locations.length > 0);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setHighlightIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 300);
    },
    [search]
  );

  const selectLocation = useCallback(
    (location: Location) => {
      const display = `${location.city}, ${location.stateCode}`;
      setQuery(display);
      setIsOpen(false);
      setHighlightIndex(-1);
      onChange(display, location);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          selectLocation(results[highlightIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        placeholder="Digite cidade ou estado..."
        required={required}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          Buscando...
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {results.map((location, index) => (
            <li
              key={`${location.stateCode}-${location.city}`}
              onClick={() => selectLocation(location)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlightIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium">{location.city}</span>
              <span className="ml-2 text-gray-500">
                {location.state} ({location.stateCode})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
