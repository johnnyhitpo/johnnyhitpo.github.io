document.addEventListener("DOMContentLoaded", function() {
    const map = L.map('map').setView([23.5, 121], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 25,
    }).addTo(map);

    const loadingDiv = document.getElementById('loading');
    let currentMode = 'city'; 
    let isShowingAll = false; 
    let currentGeoJsonLayer;

    let geoJsonDataByYear = {}; 

    const loadGeoJsonDataByYear = (years, modes) => {
        let promises = [];
        
        years.forEach(year => {
            geoJsonDataByYear[year] = {};
            modes.forEach(mode => {
                const path = `../geojson/tw_${mode}_${year}.geojson`;
                const path_all = `../geojson/tw_${mode}_all_${year}.geojson`; 
                promises.push(
                    fetch(path).then(res => res.json()).then(data => {
                        geoJsonDataByYear[year][mode] = data;
                    })
                );
                promises.push(
                    fetch(path_all).then(res => res.json()).then(data => {
                        geoJsonDataByYear[year][`${mode}_all`] = data; 
                    })
                );
            });
        });

        return Promise.all(promises);
    };

    const years = ['109', '110', '111', '112', '113'];
    const modes = ['city', 'district', 'village'];

    const getColor = (density) => {
        return density > 1000 ? '#800026' :
               density > 500  ? '#BD0026' :
               density > 200  ? '#E31A1C' :
               density > 100  ? '#FC4E2A' :
               density > 50   ? '#FD8D3C' :
               density > 20   ? '#FEB24C' :
               density > 10   ? '#FED976' :
                                '#FFEDA0';
    };

    const style = (feature) => {
        return {
            fillColor: getColor(feature.properties.人口密度),
            weight: 1,
            opacity: 1,
            color: 'black',
            fillOpacity: 0.5
        };
    };

    const highlightStyle = {
        weight: 3,
        color: 'black',
        fillOpacity: 0.5
    };

    const addGeoJsonLayer = (geoJsonData) => {
        if (currentGeoJsonLayer) {
            map.removeLayer(currentGeoJsonLayer);
        }
        currentGeoJsonLayer = L.geoJson(geoJsonData, {
            style: style,
            onEachFeature: function (feature, layer) {
                layer.on('mouseover', function (e) {
                    let content = '';
                    if (feature.properties.人口密度){
                        if (currentMode === 'city') {
                            content = `${feature.properties.縣市名稱}<br>人口密度: ${feature.properties.人口密度} 人/平方公里`;
                        } else if (currentMode === 'district') {
                            content = `${feature.properties.縣市名稱} ${feature.properties.鄉鎮市區名稱}<br>人口密度: ${feature.properties.人口密度}人/平方公里`;
                        } else if (currentMode === 'village') {
                            content = `${feature.properties.縣市名稱} ${feature.properties.鄉鎮市區名稱} ${feature.properties.村里名稱}<br>人口密度: ${feature.properties.人口密度}人/平方公里`;
                        }
                    }
                    if (content) {
                        layer.bindPopup(content).openPopup();
                        layer.setStyle(highlightStyle);
                    }
                });

                layer.on('mouseout', function (e) {
                    layer.closePopup();
                    currentGeoJsonLayer.resetStyle(e.target);
                });
                
                layer.on('click', function (e) {
                    const infoDiv = document.getElementById('info');
                    let details = `<h1>${feature.properties.縣市名稱}`;
                
                    if (feature.properties.鄉鎮市區名稱) {
                        details += ` ${feature.properties.鄉鎮市區名稱}`;
                    }              
                    if (feature.properties.村里名稱) {
                        details += ` ${feature.properties.村里名稱}`;
                    }
                    details += `</h1>`;

                    details += `<table style="width: 100%; border-collapse: collapse; border-color: black;">`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>人口密度</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.人口密度.toFixed(2)} 人/平方公里</td></tr>`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>戶量</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.戶量.toFixed(2)} 戶</td></tr>`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>男女比</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.性比例.toFixed(2)} : 100</td></tr>`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>扶養比</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.扶養比.toFixed(2)} %</td></tr>`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>扶幼比</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.扶幼比.toFixed(2)} %</td></tr>`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>扶老比</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.扶老比.toFixed(2)} %</td></tr>`;
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>老化指數</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.老化指數.toFixed(2)} %</td></tr>`;
                    let dataTime = feature.properties.資料時間.toString();
                    let dataYear = dataTime.slice(0, 3);  
                    let dataMonth = dataTime.slice(4, 6); 
                    details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>資料時間</strong></td><td style="padding: 8px; border: 1px solid black;">${dataYear}年 ${dataMonth}月</td></tr>`;
                    details += `</table><br>`;

                    const uniqueKey = `${feature.properties.縣市名稱}-${feature.properties.鄉鎮市區名稱}-${feature.properties.村里名稱}`;
                    const dataValues = [];
                    const labels = [];

                    years.forEach(year => {
                        const features = geoJsonDataByYear[year][isShowingAll ? `${currentMode}_all` : currentMode].features;
                        const matchedFeature = features.find(f => {
                            return `${f.properties.縣市名稱}-${f.properties.鄉鎮市區名稱}-${f.properties.村里名稱}` === uniqueKey;
                        });

                        labels.push(`${year}年`);
                        dataValues.push(matchedFeature ? matchedFeature.properties.人口密度 : null);
                    });

                    details += `<canvas id="densityChart" width="400" height="200"></canvas>`;

                    details += `<br><strong>資料來源</strong>`;
                    details += `<a href="https://segis.moi.gov.tw/STATCloud/QueryInterfaceView?COL=vKGgwWyRXs%252b7bKMVz25R9w%253d%253d&MCOL=iCz3tvkZIN5LRvBQN%252fB7gQ%253d%253d" target="_blank"><strong>社會經濟資料服務平台</strong></a>`;
                    infoDiv.innerHTML = details;

                    setTimeout(() => {
                        const ctx = document.getElementById('densityChart').getContext('2d');
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: '人口密度 (人/平方公里)',
                                    data: dataValues,
                                    borderColor: '#000',
                                    pointBackgroundColor: '#000',  // 設置點的顏色
                                    pointBorderColor: '#000',      // 設置點的邊框顏色
                                    pointRadius: 5,                   // 設置點的半徑（大小）
                                    fill: false,
                                    lineTension: 0.1,
                                    borderWidth: 2 
                                }]
                            },
                            options: {
                                scales: {
                                    y: {
                                        ticks: {
                                            color: '#000' 
                                        }
                                    },
                                    x: {
                                        ticks: {
                                            color: '#000'  
                                        }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        labels: {
                                            color: '#000'  
                                        }
                                    }
                                }
                            }
                        });
                    }, 0);
                    
                });
            }
        }).addTo(map);
    };

    loadGeoJsonDataByYear(years, modes).then(() => {
        loadingDiv.style.display = 'none';
        addGeoJsonLayer(geoJsonDataByYear['113']['city']); 

        document.querySelectorAll('input[name="mode"]').forEach((radio) => {
            radio.addEventListener('change', function() {
                const mode = this.value;
                addGeoJsonLayer(geoJsonDataByYear['113'][isShowingAll ? `${mode}_all` : mode]);
                currentMode = mode;
            });
        });

        map.on('zoomend', function() {
            const zoomLevel = map.getZoom();
            let newMode;
            if (zoomLevel >= 12) {
                newMode = 'village';
            } else if (zoomLevel >= 9) {
                newMode = 'district';
            } else {
                newMode = 'city';
            }
            
            if (newMode !== currentMode) {
                addGeoJsonLayer(geoJsonDataByYear['113'][isShowingAll ? `${newMode}_all` : newMode]);
                currentMode = newMode;
            }
        });
    });

    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [0, 10, 20, 50, 100, 200, 500, 1000];
        div.innerHTML = "人口密度 (人/平方公里)<br>";
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
        }
        return div;
    };
    legend.addTo(map);

    const ShowSixMetrosControl = L.Control.extend({
        options: {
            position: 'topright'
        },
    
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    
            const buttonSixMetros = L.DomUtil.create('a', '', container);
            buttonSixMetros.innerHTML = '六都';
            buttonSixMetros.href = '#';
    
            const buttonShowAll = L.DomUtil.create('a', '', container);
            buttonShowAll.innerHTML = '全國';
            buttonShowAll.href = '#';
    
            L.DomEvent.on(buttonSixMetros, 'click', function (e) {
                L.DomEvent.stopPropagation(e);
                isShowingAll = false;
                addGeoJsonLayer(geoJsonDataByYear['113'][currentMode]);
            });
    
            L.DomEvent.on(buttonShowAll, 'click', function (e) {
                L.DomEvent.stopPropagation(e);
                isShowingAll = true;
                addGeoJsonLayer(geoJsonDataByYear['113'][`${currentMode}_all`]); 
            });
    
            return container;
        }
    });
    
    map.addControl(new ShowSixMetrosControl());
});