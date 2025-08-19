/// <reference path="../types/google.maps.d.ts" />

import React, { useEffect, useRef } from 'react';
import type { Report } from '../types';
import { Severity, ReportStatus } from '../types';

interface MapComponentProps {
  reports: Report[];
  view: 'USER' | 'ADMIN';
  onMapClick?: (latLng: google.maps.LatLngLiteral) => void;
  onResolveClick?: (reportId: string) => void;
  onShowRoute?: (destination: google.maps.LatLngLiteral) => void;
  adminPosition?: google.maps.LatLngLiteral | null;
  routeDestination?: google.maps.LatLngLiteral | null;
  centerOn?: google.maps.LatLngLiteral | null;
}

const createReportMarkerElement = (report: Report): HTMLElement => {
  const element = document.createElement('div');
  let iconHtml = '';
  let bgColor = '';

  if (report.status === ReportStatus.RESOLVED) {
    bgColor = 'bg-green-500';
    iconHtml = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
  } else {
    switch (report.severity) {
      case Severity.LOW:
        bgColor = 'bg-yellow-400';
        break;
      case Severity.HIGH:
        bgColor = 'bg-red-500';
        break;
      case Severity.FIRE:
        bgColor = 'bg-orange-500';
        iconHtml = `<svg class="w-5 h-5 text-white p-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 20" fill="currentColor"><path d="M11.3,3.4C10.1,2.2,8.4,1.8,6.8,2.4C4,3.4,2.9,6.1,3.8,8.8c0.6,1.8,2.3,3.2,4.2,3.2c0.5,0,1-0.1,1.5-0.2c-0.3,0.8-0.4,1.6-0.2,2.4c0.2,0.8,0.7,1.5,1.3,2.1c0.1,0.1,0.3,0.2,0.4,0.2c0.1,0,0.3-0.1,0.4-0.2c0.2-0.2,0.2-0.5,0-0.7c-0.5-0.5-0.9-1.1-1.1-1.8c-0.2-0.6,0-1.3,0.2-1.9c0.8-0.2,1.5-0.5,2.1-1c1.2-1.2,1.7-2.8,1.2-4.4C12.8,6.5,12.5,4.8,11.3,3.4z"/></svg>`;
        break;
    }
  }

  element.innerHTML = iconHtml;
  element.className = `w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg ${bgColor} cursor-pointer transition-transform hover:scale-110`;
  return element;
};

const createAdminMarkerElement = (): HTMLElement => {
  const element = document.createElement('div');
  element.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white ring-4 ring-blue-500 ring-opacity-50 shadow-lg';
  return element;
};

export const MapComponent: React.FC<MapComponentProps> = ({ reports, view, onMapClick, onResolveClick, centerOn, adminPosition, routeDestination, onShowRoute }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const mapClickListener = useRef<google.maps.MapsEventListener | null>(null);
  
  const adminMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps?.marker) return;
    
    const chennaiCenter = { lat: 13.05, lng: 80.24 };
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: chennaiCenter,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      // A Map ID is REQUIRED for Advanced Markers. 
      // You must create a Map ID in the Google Cloud Console and paste it here.
      // Custom styles must also be configured in the Cloud Console for this Map ID.
      mapId: 'YOUR_MAP_ID_HERE'
    });

    infoWindow.current = new google.maps.InfoWindow({ minWidth: 250 });
    directionsService.current = new google.maps.DirectionsService();
    directionsRenderer.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#4A90E2',
            strokeWeight: 6,
            strokeOpacity: 0.8,
        },
    });
    directionsRenderer.current.setMap(mapInstance.current);
  }, []);

  useEffect(() => {
    if (centerOn && mapInstance.current) {
        mapInstance.current.panTo(centerOn);
        mapInstance.current.setZoom(15);
    }
  }, [centerOn]);

  useEffect(() => {
    if (mapClickListener.current) {
        mapClickListener.current.remove();
        mapClickListener.current = null;
    }
    if (view === 'USER' && onMapClick && mapInstance.current) {
        mapClickListener.current = mapInstance.current.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                onMapClick(e.latLng.toJSON());
            }
        });
    }
  }, [view, onMapClick]);

  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps?.marker) return;
    
    if (adminPosition) {
        if (!adminMarker.current) {
            adminMarker.current = new google.maps.marker.AdvancedMarkerElement({
                map: mapInstance.current,
                content: createAdminMarkerElement(),
                zIndex: 1000,
            });
        }
        adminMarker.current.position = adminPosition;
    } else if (adminMarker.current) {
        adminMarker.current.map = null;
        adminMarker.current = null;
    }
  }, [adminPosition]);

  useEffect(() => {
    const service = directionsService.current;
    const renderer = directionsRenderer.current;
    if (!service || !renderer) return;

    if (!adminPosition || !routeDestination) {
      renderer.setDirections({routes: []}); // Clear route
      return;
    }
    
    service.route(
        {
            origin: adminPosition,
            destination: routeDestination,
            travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                renderer.setDirections(result);
            } else {
                renderer.setDirections({routes: []});
                console.error(`Directions request failed due to ${status}`);
                alert(`Could not display route. The request failed with status: ${status}.\n\nPlease ensure your Google Maps API key has the Directions API enabled and billing is active on your Google Cloud project.`);
            }
        }
    );
  }, [adminPosition, routeDestination]);

  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps?.marker) return;
    const map = mapInstance.current;
    const currentInfoWindow = infoWindow.current;

    // Clear all previous report markers to ensure event listeners are updated
    markers.current.forEach(marker => {
      marker.map = null;
    });
    markers.current.clear();

    reports.forEach(report => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: report.position,
        map: map,
        title: report.locationName,
        content: createReportMarkerElement(report),
      });

      marker.addListener('gmp-click', () => {
        if (!currentInfoWindow) return;

        const severityColors: { [key in Severity]: string } = {
          [Severity.LOW]: 'text-yellow-400',
          [Severity.HIGH]: 'text-red-400',
          [Severity.FIRE]: 'text-orange-400',
        };
        
        const statusColor = report.status === ReportStatus.RESOLVED ? 'text-green-400' : severityColors[report.severity];
        const statusText = report.status === ReportStatus.RESOLVED ? 'Resolved' : report.severity;

        const adminContent = view === 'ADMIN' ? `
          <p class="text-xs text-gray-400 mb-2">${report.timestamp.toLocaleString()}</p>
          <p class="text-xs text-gray-400">Reported by: <span class="font-mono text-gray-300">${report.userEmail}</span></p>
        ` : '';
        
        const actionButtonsHtml = (view === 'ADMIN' && report.status === ReportStatus.OPEN) ? `
          <div class="mt-3 space-y-2">
            <button id="resolve-btn-${report.id}" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
              Mark as Resolved
            </button>
            <button id="route-btn-${report.id}" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
              Show Route
            </button>
          </div>
        ` : '';

        const contentString = `
          <div class="p-2 bg-gray-800 text-white rounded-lg shadow-lg font-sans max-w-xs">
            <h2 class="text-lg font-bold text-red-400 mb-2">${report.locationName}</h2>
            <p class="mb-1"><strong>Status:</strong>
              <span class="${statusColor} font-semibold ml-1">
                ${statusText}
              </span>
            </p>
            <div class="mt-2 pt-2 border-t border-gray-600">${adminContent}</div>
            ${actionButtonsHtml}
          </div>`;
        
        currentInfoWindow.setContent(contentString);
        currentInfoWindow.open({ anchor: marker, map });

        if (view === 'ADMIN' && report.status === ReportStatus.OPEN) {
          google.maps.event.addListenerOnce(currentInfoWindow, 'domready', () => {
            if (onResolveClick) {
              const button = document.getElementById(`resolve-btn-${report.id}`);
              button?.addEventListener('click', () => {
                onResolveClick(report.id);
                currentInfoWindow.close();
              });
            }
            if (onShowRoute) {
              const routeButton = document.getElementById(`route-btn-${report.id}`);
              routeButton?.addEventListener('click', () => {
                onShowRoute(report.position);
                currentInfoWindow.close();
              });
            }
          });
        }
      });

      markers.current.set(report.id, marker);
    });

  }, [reports, view, onResolveClick, onShowRoute]);

  return <div ref={mapRef} className="w-full h-full" />;
};
