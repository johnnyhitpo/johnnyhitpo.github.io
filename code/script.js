document.addEventListener("DOMContentLoaded", function() {
    // 初始化地圖並設置預設視圖
    const map = L.map('map', {
        easeLinearity: 0.5,
    }).setView([23.5, 121], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 25,
    }).addTo(map);

    // 定義全域變數
    const loadingDiv = document.getElementById('loading');
    let currentMode = 'city';  // 預設為顯示縣市
    let currentData = 'density';  // 預設為人口密度
    let isShowingAll = false;  // 判斷是否顯示全國範圍
    let currentGeoJsonLayer;  // 當前的 GeoJSON 圖層
    let legend = null;  // 圖例

    let geoJsonDataByYear = {};  // 存儲不同年份和模式的 GeoJSON 資料

    // 載入指定年份和模式的 GeoJSON 資料
    const loadGeoJsonDataByYear = (years, modes) => {
        let promises = [];
        
        years.forEach(year => {
            geoJsonDataByYear[year] = {};
            modes.forEach(mode => {
                // 載入不同年份、模式的 GeoJSON 檔案
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

    // 定義年份和模式
    const years = ['109', '110', '111', '112', '113'];
    const modes = ['city', 'district', 'village'];

    // 根據數值回傳對應的顏色
    const getColor = (value) => {
        if (currentData === 'density') {
            return value > 1000 ? '#800026' :
                   value > 500  ? '#BD0026' :
                   value > 200  ? '#E31A1C' :
                   value > 100  ? '#FC4E2A' :
                   value > 50   ? '#FD8D3C' :
                   value > 20   ? '#FEB24C' :
                   value > 10   ? '#FED976' :
                                  '#FFEDA0';
        } else if (currentData === 'household') {
            return value > 3.0  ? '#800026' :
                   value > 2.9  ? '#BD0026' :
                   value > 2.8  ? '#E31A1C' :
                   value > 2.7  ? '#FC4E2A' :
                   value > 2.6  ? '#FD8D3C' :
                   value > 2.5  ? '#FEB24C' :
                   value > 2.4  ? '#FED976' :
                                  '#FFEDA0'; 
        } else if (currentData === 'gender') {
            return value > 120 ? '#800026' :
                   value > 110 ? '#BD0026' :
                   value > 100 ? '#E31A1C' :
                   value > 90  ? '#FC4E2A' :
                   value > 80  ? '#FD8D3C' :
                   value > 70  ? '#FEB24C' :
                   value > 60  ? '#FED976' :
                                 '#FFEDA0';
        } else if (['feed', 'younger', 'elder'].includes(currentData)) {
            return value > 50 ? '#800026' :
                   value > 40 ? '#E31A1C' :
                   value > 30 ? '#FD8D3C' :
                   value > 20 ? '#FEB24C' :
                   value > 10 ? '#FED976' :
                                '#FFEDA0';
        } else if (currentData === 'aging') {
            return value > 100 ? '#800026' :
                   value > 80  ? '#BD0026' :
                   value > 60  ? '#E31A1C' :
                   value > 40  ? '#FC4E2A' :
                   value > 20  ? '#FD8D3C' :
                   value > 10  ? '#FEB24C' :
                                 '#FFEDA0';
        }
        return '#FFEDA0'; // 默認顏色
    };

    // 根據選取的資料類型返回對應的屬性值
    const getPropertyValue = (feature) => {
        switch (currentData) {
            case 'density': return feature.properties.人口密度;
            case 'household': return feature.properties.戶量;
            case 'gender': return feature.properties.性比例;
            case 'feed': return feature.properties.扶養比;
            case 'younger': return feature.properties.扶幼比;
            case 'elder': return feature.properties.扶老比;
            case 'aging': return feature.properties.老化指數;
            default: return feature.properties.人口密度;
        }
    };

    // 設置每個區域的樣式
    const style = (feature) => {
        return {
            fillColor: getColor(getPropertyValue(feature)),
            weight: 1,
            opacity: 1,
            color: 'black',
            fillOpacity: 0.5
        };
    };

    // 當滑鼠懸停在區域上時的樣式
    const highlightStyle = {
        weight: 3,
        color: 'black',
        fillOpacity: 0.5
    };

    // 添加 GeoJSON 圖層到地圖上
    const addGeoJsonLayer = (geoJsonData) => {
        if (currentGeoJsonLayer) {
            map.removeLayer(currentGeoJsonLayer);
        }
        currentGeoJsonLayer = L.geoJson(geoJsonData, {
            style: style,
            onEachFeature: function (feature, layer) {
                // 當滑鼠懸停在區域上時顯示資訊
                layer.on('mouseover', function () {
                    let content = `${feature.properties.縣市名稱}`;
                    if (currentMode !== 'city') content += ` ${feature.properties.鄉鎮市區名稱}`;
                    if (currentMode === 'village') content += ` ${feature.properties.村里名稱}`;
                    
                    let propertyLabel = {
                        'density': '人口密度',
                        'household': '戶量',
                        'gender': '男女比',
                        'feed': '扶養比',
                        'younger': '扶幼比',
                        'elder': '扶老比',
                        'aging': '老化指數'
                    }[currentData];
                
                    let value = getPropertyValue(feature);
                    if (value !== undefined && value !== null) {
                        let unit = '';
                        switch (currentData) {
                            case 'density':
                                unit = '人/km²';
                                break;
                            case 'household':
                                unit = '人/戶';
                                break;
                            case 'gender':
                                unit = ' : 100';
                                break;
                            case 'feed':
                            case 'younger':
                            case 'elder':
                            case 'aging':
                                unit = '%';
                                break;
                            default:
                                unit = '';
                        }

                        content += `<br>${propertyLabel}: ${value}${unit}`;

                        layer.bindPopup(content).openPopup();
                        layer.setStyle(highlightStyle);
                    }
                });
                
                // 當滑鼠移出區域時重置樣式
                layer.on('mouseout', function (e) {
                    layer.closePopup();
                    currentGeoJsonLayer.resetStyle(e.target);
                });
                
                // 當區域被點擊時顯示詳細資訊
                layer.on('click', function () {
                    const infoDiv = document.getElementById('info');
                    
                    setTimeout(() => {
                        let details = `<h1 id="infoTitle">${feature.properties.縣市名稱}`;
                        
                        if (feature.properties.鄉鎮市區名稱) details += ` ${feature.properties.鄉鎮市區名稱}`;             
                        if (feature.properties.村里名稱) details += ` ${feature.properties.村里名稱}`;
                        details += `</h1>`;
                    
                        details += `<table id="infoTable" style="width: 100%; border-collapse: collapse; border-color: black;">`;
                        details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>人口密度</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.人口密度.toFixed(2)} 人/km²</td></tr>`;
                        details += `<tr><td style="padding: 8px; border: 1px solid black;"><strong>戶量</strong></td><td style="padding: 8px; border: 1px solid black;">${feature.properties.戶量.toFixed(2)} 人/戶</td></tr>`;
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
                    
                        // 根據年份查找對應的資料並繪製圖表
                        years.forEach(year => {
                            const features = geoJsonDataByYear[year][isShowingAll ? `${currentMode}_all` : currentMode].features;
                            const matchedFeature = features.find(f => {
                                return `${f.properties.縣市名稱}-${f.properties.鄉鎮市區名稱}-${f.properties.村里名稱}` === uniqueKey;
                            });
                    
                            labels.push(`${year}年`);
                            dataValues.push(matchedFeature ? getPropertyValue(matchedFeature) : null);
                        });
                    
                        details += `<canvas id="dataChart" width="400" height="200"></canvas>`;
                        details += `<br><strong>資料來源</strong>`;
                        details += `<a href="https://segis.moi.gov.tw/STATCloud/QueryInterfaceView?COL=vKGgwWyRXs%252b7bKMVz25R9w%253d%253d&MCOL=iCz3tvkZIN5LRvBQN%252fB7gQ%253d%253d" target="_blank"><strong>社會經濟資料服務平台</strong></a>`;
                        infoDiv.innerHTML = details;
                    
                        // 逐步顯示標題、表格和圖表
                        setTimeout(() => {
                            document.getElementById('infoTitle').style.opacity = 1;
                        }, 100);
                    
                        setTimeout(() => {
                            document.getElementById('infoTable').style.opacity = 1;
                        }, 400);
                    
                        setTimeout(() => {
                            const ctx = document.getElementById('dataChart').getContext('2d');
                            const chartLabel = {
                                'density': '人口密度 (人/km²)',
                                'household': '戶量 (人/戶)',
                                'gender': '男女比',
                                'feed': '扶養比 (%)',
                                'younger': '扶幼比 (%)',
                                'elder': '扶老比 (%)',
                                'aging': '老化指數 (%)'
                            }[currentData];
                    
                            const chart = new Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        label: chartLabel,
                                        data: [], // 動態的資料數值
                                        borderColor: '#000',
                                        pointBackgroundColor: '#000',  
                                        pointBorderColor: '#000',      
                                        pointRadius: 5,                  
                                        fill: false,
                                        lineTension: 0.1,
                                        borderWidth: 2 
                                    }]
                                },
                                options: { 
                                    scales: { 
                                        y: { 
                                            ticks: { 
                                                color: '#000',
                                                font: {
                                                    family: 'CustomFont',  
                                                },
                                            } 
                                        }, 
                                        x: { 
                                            ticks: { 
                                                color: '#000',
                                                font: {
                                                    family: 'CustomFont',  
                                                },
                                            } 
                                        } 
                                    }, 
                                    plugins: { 
                                        legend: { 
                                            labels: { 
                                                color: '#000',
                                                font: {
                                                    family: 'CustomFont',  
                                                },
                                            } 
                                        }
                                    }
                                }
                            });

                            // 逐步顯示點
                            dataValues.forEach((value, index) => {
                                setTimeout(() => {
                                    chart.data.datasets[0].data.push(value);
                                    chart.update();
                                }, index * 100); // 每個點之間的延遲時間（100毫秒）
                            });

                            document.getElementById('dataChart').style.opacity = 1;
                        }, 700);
                    
                    }, 100);
                }); 
            }
        }).addTo(map);
    };

    // 動態更新圖例
    const updateLegend = () => {
        if (legend) {
            map.removeControl(legend); // 移除已有的圖例
        }
        legend = L.control({ position: 'bottomright' });    
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            let grades, labels;
            
            if (currentData === 'density') {
                grades = [0, 10, 20, 50, 100, 200, 500, 1000];
                labels = "人口密度 (人/km²)";
            } else if (currentData === 'household') {
                grades = [0, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0];
                labels = "戶量 (人/戶)";
            } else if (currentData === 'gender') {
                grades = [60, 70, 80, 90, 100, 110, 120];
                labels = "男女比";
            } else if (['feed', 'younger', 'elder'].includes(currentData)) {
                grades = [10, 20, 30, 40, 50];
                labels = "扶養比 (%)";
            } else if (currentData === 'aging') {
                grades = [10, 20, 40, 60, 80, 100];
                labels = "老化指數 (%)";
            }

            div.innerHTML = `${labels}<br>`;
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColor(grades[i]) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '~' + grades[i + 1] + '<br>' : '+');
            }
            return div;
        };
        legend.addTo(map);
    };

    // 載入 GeoJSON 資料並初始化地圖
    loadGeoJsonDataByYear(years, modes).then(() => {
        loadingDiv.style.display = 'none';
        addGeoJsonLayer(geoJsonDataByYear['113']['city']); 
        updateLegend();  // 初始化時顯示圖例

        // 處理模式切換事件
        document.getElementById('modeSelect').addEventListener('change', function() {
            const mode = this.value;
            addGeoJsonLayer(geoJsonDataByYear['113'][isShowingAll ? `${mode}_all` : mode]);
            currentMode = mode;
            updateLegend();
        });
        
        // 處理資料類型切換事件
        document.getElementById('dataSelect').addEventListener('change', function() {
            currentData = this.value;
            addGeoJsonLayer(geoJsonDataByYear['113'][isShowingAll ? `${currentMode}_all` : currentMode]);
            updateLegend();
        });

        // 處理地圖縮放事件
        map.on('zoomend', function() {
            const zoomLevel = map.getZoom();
            let newMode;
            if (zoomLevel >= 12) {
                newMode = 'village';
            } else if (zoomLevel >= 10) {
                newMode = 'district';
            } else {
                newMode = 'city';
            }
            
            if (newMode !== currentMode) {
                addGeoJsonLayer(geoJsonDataByYear['113'][isShowingAll ? `${newMode}_all` : newMode]);
                currentMode = newMode;
                updateLegend();
            }
        });
    });

    // 自訂控制項：顯示六都或全國
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
                updateLegend();
            });
    
            L.DomEvent.on(buttonShowAll, 'click', function (e) {
                L.DomEvent.stopPropagation(e);
                isShowingAll = true;
                addGeoJsonLayer(geoJsonDataByYear['113'][`${currentMode}_all`]); 
                updateLegend();
            });
    
            return container;
        }
    });
    
    map.addControl(new ShowSixMetrosControl());
});