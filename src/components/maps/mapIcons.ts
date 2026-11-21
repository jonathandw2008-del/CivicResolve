import L from 'leaflet';
import { ComplaintPriority } from '../../types/complaint';

/**
 * Creates SVG-based Leaflet DivIcons to ensure reliable rendering in bundled web apps
 * without relying on external PNG asset files.
 */

const PRIORITY_COLORS: Record<ComplaintPriority, { bg: string; border: string; glow: string }> = {
  Critical: { bg: '#F43F5E', border: '#FDA4AF', glow: 'rgba(244, 63, 94, 0.4)' },
  High: { bg: '#F59E0B', border: '#FDE68A', glow: 'rgba(245, 158, 11, 0.4)' },
  Medium: { bg: '#38BDF8', border: '#BAE6FD', glow: 'rgba(56, 189, 248, 0.4)' },
  Low: { bg: '#14B8A6', border: '#99F6E4', glow: 'rgba(20, 184, 166, 0.4)' },
};

export function createComplaintPriorityIcon(priority: ComplaintPriority, isSelected = false) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  const size = isSelected ? 36 : 28;
  const pulse = priority === 'Critical' ? 'animate-pulse' : '';

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      <div class="${pulse}" style="position: absolute; inset: 0; border-radius: 9999px; background: ${c.glow}; transform: scale(1.3);"></div>
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${c.bg};
        border: 2px solid ${c.border};
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 0 10px ${c.glow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #071426;
        font-weight: 900;
        font-size: ${size * 0.4}px;
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-civic-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function createLocationPickerIcon() {
  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; bottom: 0; width: 14px; height: 4px; background: rgba(0,0,0,0.5); border-radius: 50%; filter: blur(1px);"></div>
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 9999px 9999px 9999px 0;
        transform: rotate(-45deg);
        background: #14B8A6;
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5), 0 0 12px rgba(20, 184, 166, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: #071426;
          border-radius: 50%;
        "></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-picker-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

export function createNumberedRouteStopIcon(stopNumber: number, priority: ComplaintPriority) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  const isCritical = priority === 'Critical';

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ${isCritical ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; border: 2px dashed #FDA4AF; animation: spin 4s linear infinite;"></div>` : ''}
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background: ${c.bg};
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.6), 0 0 8px ${c.glow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #071426;
        font-family: monospace, sans-serif;
        font-weight: 900;
        font-size: 13px;
      ">
        ${stopNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-route-stop-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export function createStartPointIcon(label: string = 'HQ') {
  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: #10B981;
        border: 2px solid #A7F3D0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.6), 0 0 10px rgba(16, 185, 129, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #071426;
        font-weight: 900;
        font-size: 10px;
        letter-spacing: -0.5px;
      ">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-start-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}
