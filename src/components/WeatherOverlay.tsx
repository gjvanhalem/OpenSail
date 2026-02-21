import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WeatherData, WeatherLayer, GeoBounds } from '../types';

export interface WeatherOverlayProps {
  weatherData: WeatherData | null;
  bounds: GeoBounds;
  opacity?: number;
  visible?: boolean;
}

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  weatherData,
  bounds,
  opacity = 0.6,
  visible = true
}) => {
  const [interpolatedData, setInterpolatedData] = useState<number[][][]>([]);

  useEffect(() => {
    if (weatherData && visible) {
      setInterpolatedData(interpolateWeatherData(weatherData));
    }
  }, [weatherData, visible]);

  if (!visible || !weatherData || interpolatedData.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { opacity }]}>
      {renderWeatherGrid(interpolatedData, weatherData.layer, bounds)}
    </View>
  );
};

function interpolateWeatherData(weatherData: WeatherData): number[][][] {
  const smoothData: number[][][] = [];
  const data = weatherData.data;

  for (let i = 0; i < data.length; i++) {
    smoothData[i] = [];
    for (let j = 0; j < data[i].length; j++) {
      smoothData[i][j] = [];
      
      for (let k = 0; k < data[i][j].length; k++) {
        let sum = data[i][j][k];
        let count = 1;

        if (i > 0) {
          sum += data[i - 1][j][k];
          count++;
        }
        if (i < data.length - 1) {
          sum += data[i + 1][j][k];
          count++;
        }
        if (j > 0) {
          sum += data[i][j - 1][k];
          count++;
        }
        if (j < data[i].length - 1) {
          sum += data[i][j + 1][k];
          count++;
        }

        smoothData[i][j][k] = sum / count;
      }
    }
  }

  return smoothData;
}

function renderWeatherGrid(
  data: number[][][],
  layer: WeatherLayer,
  bounds: GeoBounds
): React.ReactNode {
  const cells: React.ReactNode[] = [];
  const latSteps = data.length;
  const lonSteps = data[0]?.length || 0;

  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;
      const values = data[i][j];

      const color = getColorForValue(layer, values);
      
      if (color) {
        cells.push(
          <View
            key={`${i}-${j}`}
            style={[
              styles.cell,
              {
                backgroundColor: color,
                left: `${(j / lonSteps) * 100}%`,
                top: `${(i / latSteps) * 100}%`,
                width: `${(1 / lonSteps) * 100}%`,
                height: `${(1 / latSteps) * 100}%`
              }
            ]}
          />
        );
      }

      if (layer === WeatherLayer.Wind && values.length >= 2) {
        cells.push(
          <View
            key={`arrow-${i}-${j}`}
            style={[
              styles.windArrow,
              {
                left: `${((j + 0.5) / lonSteps) * 100}%`,
                top: `${((i + 0.5) / latSteps) * 100}%`,
                transform: [{ rotate: `${values[1]}deg` }]
              }
            ]}
          />
        );
      }
    }
  }

  return <>{cells}</>;
}

function getColorForValue(layer: WeatherLayer, values: number[]): string | null {
  if (!values || values.length === 0) return null;

  const value = values[0];

  switch (layer) {
    case WeatherLayer.Wind:
      if (value < 5) return 'rgba(0, 255, 0, 0.3)';
      if (value < 10) return 'rgba(255, 255, 0, 0.3)';
      if (value < 15) return 'rgba(255, 165, 0, 0.3)';
      if (value < 20) return 'rgba(255, 100, 0, 0.3)';
      return 'rgba(255, 0, 0, 0.3)';

    case WeatherLayer.Waves:
      if (value < 1) return 'rgba(0, 200, 255, 0.2)';
      if (value < 2) return 'rgba(0, 150, 255, 0.3)';
      if (value < 3) return 'rgba(0, 100, 255, 0.4)';
      return 'rgba(0, 50, 255, 0.5)';

    case WeatherLayer.Precipitation:
      if (value < 1) return null;
      if (value < 2) return 'rgba(100, 100, 255, 0.2)';
      if (value < 5) return 'rgba(50, 50, 255, 0.3)';
      return 'rgba(0, 0, 255, 0.4)';

    case WeatherLayer.Pressure:
      if (value < 1000) return 'rgba(255, 0, 0, 0.2)';
      if (value < 1010) return 'rgba(255, 165, 0, 0.2)';
      if (value < 1020) return 'rgba(0, 255, 0, 0.2)';
      return 'rgba(0, 200, 0, 0.2)';

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  cell: {
    position: 'absolute'
  },
  windArrow: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  }
});
