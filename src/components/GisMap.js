'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix lỗi hiển thị marker icon mặc định của Leaflet trong React
const fixLeafletIcon = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  });
};

// Component helper để tự động điều chỉnh tầm nhìn bản đồ khi có thửa đất được chọn
function MapController({ selectedPlot, plots }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedPlot && selectedPlot.coordinates && selectedPlot.coordinates.length > 0) {
      // Tính tâm của polygon
      const lats = selectedPlot.coordinates.map(coord => coord[0]);
      const lngs = selectedPlot.coordinates.map(coord => coord[1]);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      
      map.setView([centerLat, centerLng], 17, { animate: true, duration: 1.5 });
    }
  }, [selectedPlot, map]);

  return null;
}

export default function GisMap({ plots, selectedPlotId, onSelectPlot }) {
  const mapRef = useRef(null);

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Màu sắc đại diện cho các trạng thái bồi thường
  const getPlotStyle = (plot) => {
    const isSelected = plot.id === selectedPlotId;
    
    let color = '#3b82f6'; // Mặc định: Blue
    let fillColor = '#3b82f6';
    
    switch (plot.status) {
      case 'completed': // Đã bàn giao
        color = '#10b981'; // Emerald
        fillColor = '#10b981';
        break;
      case 'processing': // Đang di dời
        color = '#f59e0b'; // Amber
        fillColor = '#f59e0b';
        break;
      case 'pending': // Đang thương thảo
        color = '#a855f7'; // Purple
        fillColor = '#a855f7';
        break;
      case 'disputed': // Tranh chấp
        color = '#ef4444'; // Red
        fillColor = '#ef4444';
        break;
    }

    return {
      color: isSelected ? '#ffffff' : color,
      weight: isSelected ? 3 : 1.5,
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.6 : 0.25,
      dashArray: isSelected ? '4' : '0',
    };
  };

  const selectedPlot = plots.find(p => p.id === selectedPlotId);
  const defaultCenter = [10.7288, 106.7218]; // Tọa độ khu vực Phú Mỹ Hưng, Q7

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-emerald-500/20 shadow-lg shadow-black/40">
      <div className="absolute top-4 left-4 z-[999] bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 px-3 py-2 rounded-lg pointer-events-none shadow-md">
        <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Bản đồ số GIS đền bù
        </h4>
        <p className="text-[10px] text-slate-400 mt-0.5">Tuyến Metro Bến Thành - Cần Giờ</p>
      </div>

      <div className="absolute bottom-4 left-4 z-[999] bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-lg text-[10px] text-slate-300 flex flex-col gap-1.5 shadow-md">
        <span className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-0.5">Chú giải trạng thái</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500"></span>
          <span>Đã bàn giao mặt bằng</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500"></span>
          <span>Đang triển khai di dời</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500"></span>
          <span>Đang thương thảo phương án</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500"></span>
          <span>Đang tranh chấp ranh đất</span>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full"
        ref={mapRef}
      >
        {/* Sử dụng map nền tối CartoDB Dark Matter để tạo giao diện premium */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {plots.map((plot) => (
          <Polygon
            key={plot.id}
            positions={plot.coordinates}
            eventHandlers={{
              click: () => {
                onSelectPlot(plot.id);
              },
            }}
            pathOptions={getPlotStyle(plot)}
          >
            <Popup className="custom-popup">
              <div className="text-xs p-1">
                <p className="font-bold text-slate-900">{plot.code} - {plot.owner}</p>
                <p className="text-[10px] text-slate-600 mt-1">{plot.address}</p>
                <p className="text-[10px] font-semibold text-slate-800 mt-0.5">Diện tích: {plot.area} m²</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Trạng thái: {plot.statusText}</p>
              </div>
            </Popup>
          </Polygon>
        ))}

        <MapController selectedPlot={selectedPlot} plots={plots} />
      </MapContainer>
    </div>
  );
}
