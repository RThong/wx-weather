const wxCharts = require('../../utils/wxcharts.js');
const moment = require('../../utils/moment.js');
const DropAnimation = require('../../utils/wx-canvas-animation.js')
const cityList = require('../../lib/city.js')

let app = getApp();
let lineChart = null;
Page({
  data: {
    refreshFlag: false,
    address: '',
    refresh_time: '',
    now: '',//现在天气
    future: [],//未来天气
    hidden: true,
    autoPosition: true,
    region: ['北京市', '北京市', '东城区'],
    canvasShow: false,//模态框弹出,表格消失
    loadingFlag: true
  },
  onLoad: function (e) {
    this.init();
    new DropAnimation({
      el: '#canvas1',
      ctx: wx.createCanvasContext('rainCanvas'),
      speed: 4,
      color: '#cccccc',
      type: 'rain',
      count: 10,
      width: 750,
      height: 200
    })

    new DropAnimation({
      el: '#canvas2',
      ctx: wx.createCanvasContext('snowCanvas'),
      speed: 1,
      color: '#cccccc',
      type: 'snow',
      count: 15,
      width: 750,
      height: 200
    })

  },
  touchHandler(e) {
    lineChart.showToolTip(e, {
      // background: '#7cb5ec',
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  //获取城市id
  getCityId(city_name, region_name){
    let arr1 = [], arr2 = [], region, city
    cityList.map(item => {
      if (item.countyname.indexOf(region_name) !== -1){
        arr1.push(item)
      }
      if (item.countyname.indexOf(city_name) !== -1) {
        city = item
      }
    })
    if(arr1.length === 1){
      return {
        region: arr1[0],//只匹配到一个地名
        city
      }
    }
    else if(arr1.length === 0){
      return {
        city
      }
    }
    else{
      arr1.map(item => {
        arr2.push(item.areaid - city.areaid)
      })
      let min, minIndex = 0
      arr2.map((item, index) => {
        if(item > 0){
          if(!min) {
            min = item
          }
          else{
            if(item < min){
              min = item
              minIndex = index
            }
          }
        }
      })
      return {
        region: arr1[minIndex],
        city
      }
    }
  },
  //选择位置获取天气信息
  getInfoBySelect(positionArr) {
    let _this = this;
    let arr = [];
    for (let i in positionArr) {
      arr[i] = positionArr[i].substr(0, 2);
    }
    switch (arr[0]) {
      case '内蒙': arr[0] = '内蒙古'; break;
      case '黑龙': arr[0] = '黑龙江'; break;
    }
    let query1 = arr[0] + arr[2],//省加区
        query2 = arr[0] + arr[1];//省加市

    const cityObj = this.getCityId(arr[1], arr[2])
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://aider.meizu.com/app/weather/listWeather',
        data: {
          cityIds: cityObj.region ? cityObj.region.areaid : cityObj.city.areaid
        },
        success(res) {
          console.log('----------')
          console.log(res)
          _this.setData({
            now: {
              aqi: res.data.value[0].pm25.aqi,
              quality: res.data.value[0].pm25.quality,
              ...res.data.value[0].realtime,              
            },
            future: res.data.value[0].weathers.splice(0, 6),
            address: res.data.value[0].city,
            refresh_time: moment().format('HH:mm')
          });
          _this.setNavColor(_this.data.now.img);
          resolve()
        },
        fail() {
          console.log('fail')
        }
      })
    })
  },
  //自动定位获取天气信息
  getWeatherInfo() {
    let _this = this;
    return new Promise((resolve, reject) => {
      wx.getLocation({
        success(res) {
          console.log(res)
          let locationQuery = res.latitude + ':' + res.longitude;
          wx.request({
            url: 'https://api.seniverse.com/v3/location/search.json?key=1jriv92unc4kjqqr',
            data: {
              q: locationQuery
            },
            success: function (res) {
              //直接name可能获取不到数据 要判断两次
              let cityName = res.data.results[0].path.split(',')
              
              const cityObj = _this.getCityId(cityName[1], cityName[0])

                wx.request({
                  url: 'https://aider.meizu.com/app/weather/listWeather',
                  data: {
                    cityIds: cityObj.region ? cityObj.region.areaid : cityObj.city.areaid
                  },
                  success(res) {
                    _this.setData({
                      now: {
                        aqi: res.data.value[0].pm25.aqi,
                        quality: res.data.value[0].pm25.quality,
                        ...res.data.value[0].realtime,
                      },
                      future: res.data.value[0].weathers.splice(0, 6),
                      address: res.data.value[0].city,
                      refresh_time: moment().format('HH:mm')
                    });
                    _this.setNavColor(_this.data.now.img);
                    resolve()
                  },
                  fail() {
                    console.log('fail')
                  }
                })
            },
            fail() {
              console.log('fail')
            }
          })
        },
        fail() {
          console.log('fail')
        }
      })
    })
  },
  //构建天气表信息
  createSimulationData() {
    let categories = [],
      data = {
        high: [],
        low: []
      };
    for (let i of this.data.future) {
      categories.push(i.week[2]);
      data.high.push(i.temp_day_c);
      data.low.push(i.temp_night_c)
    }
    categories[0] = '今', categories[1] = '明';
    return {
      categories,
      data
    }
  },

  init() {
    this.setData({
      refreshFlag: true
    });
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }

    let _this = this;
    wx.getStorage({
      key: 'position',
      success(res) {
        Promise.all([_this.refreshAnimation(), _this.getInfoBySelect(res.data.position)]).then(() => {
          var simulationData = _this.createSimulationData();

          lineChart = new wxCharts({
            canvasId: 'lineCanvas',
            type: 'line',
            categories: simulationData.categories,
            animation: true,
            series: [{
              name: '最高',
              data: simulationData.data.high,
              format: function (val) {
                return val + '°';
              }
            },
            {
              name: '最低',
              data: simulationData.data.low,
              format: function (val) {
                return val + '°';
              }
            }],
            xAxis: {
              disableGrid: true,
              fontColor: '#ffffff',
            },
            yAxis: {
              disabled: true
            },
            width: windowWidth,
            height: 200,
            legend: false,
            dataLabel: true,
            dataPointShape: false,
            extra: {
              lineStyle: 'curve'
            }
          });

        })
      },
      fail(res) {
        //自动定位
        Promise.all([_this.refreshAnimation(), _this.getWeatherInfo()]).then(() => {
          var simulationData = _this.createSimulationData();
          lineChart = new wxCharts({
            canvasId: 'lineCanvas',
            type: 'line',
            categories: simulationData.categories,
            animation: true,
            series: [{
              name: '最高',
              data: simulationData.data.high,
              format: function (val) {
                return val + '°';
              }
            },
            {
              name: '最低',
              data: simulationData.data.low,
              format: function (val) {
                return val + '°';
              }
            }],
            xAxis: {
              disableGrid: true,
              fontColor: '#ffffff',
            },
            yAxis: {
              disabled: true
            },
            width: windowWidth,
            height: 200,
            legend: false,
            dataLabel: true,
            dataPointShape: false,
            extra: {
              lineStyle: 'curve'
            }
          });

        })
      }
    })

  },
  //刷新动画
  refreshAnimation() {
    return new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        this.setData({
          refreshFlag: false
        });
        clearTimeout(timer);
        resolve();
      }, 2000);
    })
  },
  modalShow() {
    let _this = this;
    this.setData({
      canvasShow: true
    });

    wx.getStorage({
      key: 'position',
      success(res) {
        _this.setData({
          autoPosition: false,
          region: res.data.position
        });
      },
      fail(res) {
        console.log(res)
      },
      complete() {
        _this.setData({
          hidden: false
        });
      }
    })

  },



  //模态框
  cancel: function () {
    this.setData({
      hidden: true,
      canvasShow: false
    });
  },
  confirm: function () {
    let _this = this;
    if (!this.data.autoPosition) {
      wx.setStorage({
        key: 'position',
        data: {
          position: _this.data.region
        },
        success() {
          _this.setData({
            hidden: true,
            canvasShow: true,
            loadingFlag: true
          });
          _this.init();
        },
        fail() {
          console.log('fail')
        }
      })
    }
    else {
      wx.removeStorage({
        key: 'position',
        success(res) {
          _this.setData({
            hidden: true,
            canvasShow: true,
            loadingFlag: true
          });
          _this.init();
        },
        fail() {
          console.log('fail')
        }
      })
    }
  },
  //根据不同天气的背景色设置nav颜色并关闭loading界面
  setNavColor(code) {
    if (code >= 2) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#6f979f'
      })
    }
    else {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#36749d'
      })
    }
    this.setData({
      loadingFlag: false,
      canvasShow: false
    })
  },
  switch1Change: function (e) {
    this.setData({
      autoPosition: e.detail.value
    });
  },
  switch2Change: function (e) {
    this.setData({
      autoPosition: !e.detail.value
    });
  },
  bindRegionChange: function (e) {
    this.setData({
      region: e.detail.value
    })
  }
});