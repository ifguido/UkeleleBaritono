import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { G, Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { IN_TUNE_CENTS, TuningVerdict } from "@core/engine/tuning";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/useTheme";

interface Props {
  /** Desvío en cents, o null si no hay nota. */
  cents: number | null;
  verdict: TuningVerdict | null;
  /** Nota grande del centro ("D3"). */
  note: string;
  /** Línea de abajo ("146,8 Hz · −20 cents"). */
  detail: string;
  /** Cents que abarca el dial a cada lado. */
  range?: number;
}

const WIDTH = 340;
const HEIGHT = 208;
const CX = WIDTH / 2;
const CY = 176;
const RADIUS = 134;
const RING = 15;
const SWEEP = 68;

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Dial de afinación. El indicador viaja sobre el arco en vez de ser una
 * aguja desde el centro: así el nombre de la nota queda siempre legible,
 * que es lo que uno mira de reojo mientras gira la clavija.
 *
 * La zona verde son los ±5 cents que el oído no distingue.
 */
export function TunerGauge({ cents, verdict, note, detail, range = 50 }: Props) {
  const t = useTheme();
  const clamped = cents === null ? 0 : Math.max(-range, Math.min(range, cents));
  const target = (clamped / range) * SWEEP;

  // La aguja se anima en el hilo de UI: el análisis corre 25 veces por
  // segundo y sin suavizado el indicador tiembla.
  const angle = useSharedValue(0);
  useEffect(() => {
    angle.set(withTiming(target, { duration: 90 }));
  }, [target, angle]);
  const animatedProps = useAnimatedProps(() => ({ rotation: angle.get() }));

  const inTune = verdict === "afinada";
  const color = verdict ? (inTune ? "#059669" : "#d97706") : t.soft;
  const silent = cents === null;

  const point = (degrees: number, r: number) => {
    const rad = ((degrees - 90) * Math.PI) / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)] as const;
  };
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = point(from, r);
    const [x2, y2] = point(to, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const greenHalf = (IN_TUNE_CENTS / range) * SWEEP;
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].filter((tick) => Math.abs(tick) <= range);

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} accessibilityLabel={silent ? "Sin señal" : `${note}, ${Math.round(cents)} cents`}>
        <Path d={arc(-SWEEP, SWEEP, RADIUS)} fill="none" stroke={t.faint} strokeWidth={RING} strokeLinecap="round" />
        <Path d={arc(-greenHalf, greenHalf, RADIUS)} fill="none" stroke={inTune ? "#059669" : t.scheme === "dark" ? "#065f46" : "#a7f3d0"} strokeWidth={RING} strokeLinecap="round" />

        {ticks.map((tick) => {
          const degrees = (tick / range) * SWEEP;
          const major = tick % 20 === 0;
          const [x1, y1] = point(degrees, RADIUS - RING / 2 - 2);
          const [x2, y2] = point(degrees, RADIUS - RING / 2 - (major ? 13 : 7));
          return <Line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tick === 0 ? t.ink : t.borderStrong} strokeWidth={tick === 0 ? 2.5 : 1.5} />;
        })}

        <AnimatedG animatedProps={animatedProps} originX={CX} originY={CY} opacity={silent ? 0.2 : 1}>
          <Path d={arc(-2.6, 2.6, RADIUS)} fill="none" stroke={color} strokeWidth={RING + 6} strokeLinecap="butt" />
          <Polygon
            points={`${CX},${CY - RADIUS + RING / 2 + 12} ${CX - 8},${CY - RADIUS + RING / 2 + 25} ${CX + 8},${CY - RADIUS + RING / 2 + 25}`}
            fill={color}
          />
        </AnimatedG>

        <SvgText x={CX} y={CY - 46} fontSize={note.length > 2 ? 46 : 52} fill={silent ? t.borderStrong : t.text} textAnchor="middle" fontWeight="700">
          {note}
        </SvgText>
        <SvgText x={CX} y={CY - 22} fontSize={12.5} fill={t.textMuted} textAnchor="middle" fontFamily={fonts.mono}>
          {detail}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: WIDTH, alignSelf: "center", aspectRatio: WIDTH / HEIGHT },
});
