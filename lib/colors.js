export const PARTICIPANT_COLORS = [
  { dot: '#534AB7', bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' },
  { dot: '#0F6E56', bg: '#E6F5F1', text: '#0A5240', border: '#7DC5B5' },
  { dot: '#A32D2D', bg: '#FDEAEA', text: '#7A1E1E', border: '#E8A0A0' },
  { dot: '#854F0B', bg: '#FAEEDA', text: '#6A3D08', border: '#D9A96A' },
  { dot: '#1565C0', bg: '#E3F0FF', text: '#0D47A1', border: '#90BBF0' },
  { dot: '#6A1B9A', bg: '#F3E5F5', text: '#4A148C', border: '#CE93D8' },
  { dot: '#00695C', bg: '#E0F2F1', text: '#004D40', border: '#80CBC4' },
  { dot: '#E65100', bg: '#FBE9E7', text: '#BF360C', border: '#FFAB91' },
];

export function getNextColor(participants) {
  return PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
}
