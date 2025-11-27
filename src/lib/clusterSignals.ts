import { MarkerPosition, MarkerCluster, Signal } from '@/types';

interface ClusterOptions {
  yThreshold?: number;  // Y축 거리 임계값 (픽셀)
  minClusterSize?: number;  // 클러스터 최소 크기
}

/**
 * 같은 X좌표(캔들)에 있는 마커들을 Y좌표 기준으로 클러스터링
 * @param positions 마커 위치 배열
 * @param options 클러스터링 옵션
 * @returns 클러스터 배열과 단독 마커 배열
 */
export function clusterMarkers(
  positions: MarkerPosition[],
  options: ClusterOptions = {}
): { clusters: MarkerCluster[]; standalone: MarkerPosition[] } {
  const { yThreshold = 25, minClusterSize = 3 } = options;

  // X좌표(캔들)별로 그룹화
  const byX = new Map<number, MarkerPosition[]>();

  for (const pos of positions) {
    const key = Math.round(pos.x);  // X좌표 반올림 (같은 캔들)
    if (!byX.has(key)) {
      byX.set(key, []);
    }
    byX.get(key)!.push(pos);
  }

  const clusters: MarkerCluster[] = [];
  const standalone: MarkerPosition[] = [];

  // 각 X좌표 그룹 내에서 Y좌표 기준 클러스터링
  for (const [, group] of byX) {
    if (group.length < minClusterSize) {
      // 클러스터 최소 크기 미만이면 단독 마커로
      standalone.push(...group);
      continue;
    }

    // Y좌표 기준 정렬
    const sorted = [...group].sort((a, b) => a.y - b.y);

    // 근접한 마커들을 클러스터로 묶기
    let currentCluster: MarkerPosition[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (Math.abs(curr.y - prev.y) <= yThreshold) {
        // 근접하면 같은 클러스터에 추가
        currentCluster.push(curr);
      } else {
        // 멀면 이전 클러스터 마무리하고 새 클러스터 시작
        processCluster(currentCluster, clusters, standalone, minClusterSize);
        currentCluster = [curr];
      }
    }

    // 마지막 클러스터 처리
    processCluster(currentCluster, clusters, standalone, minClusterSize);
  }

  return { clusters, standalone };
}

/**
 * 클러스터 또는 단독 마커로 분류
 */
function processCluster(
  group: MarkerPosition[],
  clusters: MarkerCluster[],
  standalone: MarkerPosition[],
  minClusterSize: number
): void {
  if (group.length >= minClusterSize) {
    // 클러스터 생성
    const signals = group.map(p => p.signal);
    const avgX = group.reduce((sum, p) => sum + p.x, 0) / group.length;
    const avgY = group.reduce((sum, p) => sum + p.y, 0) / group.length;

    clusters.push({
      id: `cluster_${signals.map(s => s.id).join('_')}`,
      signals,
      x: avgX,
      y: avgY,
    });
  } else {
    // 단독 마커로
    standalone.push(...group);
  }
}

/**
 * 펼쳐진 클러스터의 각 시그널 위치 계산 (원형 배치)
 */
export function calculateExpandedPositions(
  cluster: MarkerCluster,
  radius: number = 50
): { signal: Signal; x: number; y: number; angle: number }[] {
  const { signals, x: centerX, y: centerY } = cluster;
  const count = signals.length;

  // 시작 각도를 -90도(위쪽)로 설정
  const startAngle = -90;
  const angleStep = 360 / count;

  return signals.map((signal, index) => {
    const angleDeg = startAngle + (index * angleStep);
    const angleRad = (angleDeg * Math.PI) / 180;

    return {
      signal,
      x: centerX + radius * Math.cos(angleRad),
      y: centerY + radius * Math.sin(angleRad),
      angle: angleDeg,
    };
  });
}

/**
 * 클러스터의 다수 sentiment 판단
 */
export function getMajoritySentiment(
  cluster: MarkerCluster
): 'LONG' | 'SHORT' | 'MIXED' {
  const longCount = cluster.signals.filter(s => s.sentiment === 'LONG').length;
  const shortCount = cluster.signals.filter(s => s.sentiment === 'SHORT').length;

  if (longCount > shortCount) return 'LONG';
  if (shortCount > longCount) return 'SHORT';
  return 'MIXED';
}
