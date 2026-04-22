import 'mapbox-gl/dist/mapbox-gl.css';

import mapboxgl from 'mapbox-gl';
import { FC, useEffect, useRef, useState } from 'react';
import domo from 'ryuu.js';

import styles from './Map.module.scss';
import rawMapStyle from './map-style.json';

const POPULATION_LIMIT = 50_000;
const POINT_STEP = 100_000;
const COLORS = ['#8F1CCD', '#A221B9', '#E0329D', '#DF7B90', '#E8AD85'];

interface GeoRow {
  city: string;
  lat: number;
  long: number;
  dataPoint: number;
}

interface Point {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
}

const getPointRadius = (row: GeoRow): number => {
  const step = Math.min(
    Math.floor((row.dataPoint - POPULATION_LIMIT) / POINT_STEP),
    3,
  );
  return 1 + step * 0.2;
};

const getPointColor = (row: GeoRow): string => {
  const step = Math.min(
    Math.floor((row.dataPoint - POPULATION_LIMIT) / POINT_STEP),
    4,
  );
  return COLORS[step];
};

export const Map: FC = () => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = (await domo.get(
        '/data/v1/geoData',
      )) as unknown as GeoRow[];
      setPoints(
        response.map((row) => ({
          name: row.city,
          latitude: row.lat,
          longitude: row.long,
          radius: getPointRadius(row),
          color: getPointColor(row),
        })),
      );
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (points.length === 0 || !mapContainerRef.current) return;

    mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: rawMapStyle as unknown as mapboxgl.StyleSpecification,
      maxBounds: [
        [-230, -60],
        [230, 70],
      ],
    });

    mapRef.current.on('load', () => {
      const dataPoints: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: points.map((point) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude],
          },
          properties: {
            name: point.name,
            radius: point.radius,
            color: point.color,
          },
        })),
      };

      mapRef.current?.addSource('dataPoints', {
        type: 'geojson',
        data: dataPoints,
      });

      mapRef.current?.addLayer({
        id: 'circle-layer',
        type: 'circle',
        source: 'dataPoints',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.7,
        },
      });
    });

    return () => {
      mapRef.current?.remove();
    };
  }, [points]);

  return <div className={styles.mapContainer} ref={mapContainerRef} />;
};
