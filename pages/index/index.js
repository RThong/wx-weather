let wxCharts = require('../../utils/wxcharts.js');
let moment = require('../../utils/moment.js');
let app = getApp();
let lineChart = null;
Page({
  data: {
    refreshFlag: false,
    address: '',
    refresh_time: '',
    now: '',//现在天气
    future: [],//未来天气
    days: 7,//取几天数据
    hidden: true,
    autoPosition: true,
    region: ['北京市', '北京市', '东城区'],
    canvasShow: false,//模态框弹出,表格消失
    loadingFlag: true
  },
  onShow() {
    console.log('show');
  },
  onReady() {
    console.log('ready')
  },
  touchHandler(e) {
    lineChart.showToolTip(e, {
      // background: '#7cb5ec',
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  //选择位置获取天气信息
  getInfoBySelect(positionArr) {
    let _this = this;
    let arr = [];
    for (let i in positionArr) {
      arr[i] = positionArr[i].substr(0, 2);
    }
    switch(arr[0]){
      case '内蒙': arr[0]='内蒙古'; break;
      case '黑龙': arr[0] = '黑龙江'; break;
    }
    let query1 = arr[0] + arr[2],//省加区
        query2 = arr[0] + arr[1];//省加市
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.seniverse.com/v3/location/search.json?key=1jriv92unc4kjqqr',
        data: {
          q: query1
        },
        success: function (res) {      
          //如果按省+区没找到
          console.log(res)
          if (res.data.results.length != 0) {
            let cityId = res.data.results[0].id;
            wx.request({
              url: 'https://weixin.jirengu.com/weather/now',
              data: {
                cityid: cityId
              },
              success: function (res) {
                _this.setData({
                  now: res.data.weather[0].now,
                  future: res.data.weather[0].future.splice(0, _this.data.days),
                  address: res.data.weather[0].city_name,
                  refresh_time: moment().format('HH:mm')
                });
                _this.setNavColor(_this.data.now.code);
                resolve();
              }
            })
          }
          //按省+市找
          else {
            wx.request({
              url: 'https://api.seniverse.com/v3/location/search.json?key=1jriv92unc4kjqqr',
              data: {
                q: query2
              },
              success: function (res) {
                let cityId = res.data.results[0].id
                
                wx.request({
                  url: 'https://weixin.jirengu.com/weather/now',
                  data: {
                    cityid: cityId
                  },
                  success: function (res) {
                    _this.setData({
                      now: res.data.weather[0].now,
                      future: res.data.weather[0].future.splice(0, _this.data.days),
                      address: res.data.weather[0].city_name,
                      refresh_time: moment().format('HH:mm')
                    });
                    _this.setNavColor(_this.data.now.code);
                    resolve();
                  }
                })
              }
            })
          }
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
          let locationQuery = res.latitude + ':' + res.longitude;
          wx.request({
            url: 'https://api.seniverse.com/v3/location/search.json?key=1jriv92unc4kjqqr',
            data:{
              q: locationQuery
            },
            success: function (res) {
              let cityId = res.data.results[0].id
              wx.request({
                url: 'https://weixin.jirengu.com/weather/now',
                data: {
                  cityid: cityId
                },
                success: function (res) {
                  _this.setData({
                    now: res.data.weather[0].now,
                    future: res.data.weather[0].future.splice(0, _this.data.days),
                    address: res.data.weather[0].city_name,
                    refresh_time: moment().format('HH:mm')
                  });
                  _this.setNavColor(_this.data.now.code);
                  resolve();
                }
              })
            }
          })
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
      categories.push(i.day[1]);
      data.high.push(i.high);
      data.low.push(i.low)
    }
    categories[0] = '今', categories[1] = '明';
    return {
      categories: categories,
      data: data
    }
  },
  onLoad: function (e) {
    this.init();
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
              name: '最低',
              data: simulationData.data.low,
              format: function (val) {
                return val + '°';
              }
            },
            {
              name: '最高',
              data: simulationData.data.high,
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
              name: '最低',
              data: simulationData.data.low,
              format: function (val) {
                return val + '°';
              }
            },
            {
              name: '最高',
              data: simulationData.data.high,
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
    console.log(this.data.region)
    if (!this.data.autoPosition) {
      wx.setStorage({
        key: 'position',
        data: {
          position: _this.data.region
        },
        success() {
          _this.setData({
            hidden: true,
            canvasShow: false
          });
          _this.init();
        }
      })
    }
    else {
      wx.removeStorage({
        key: 'position',
        success(res) {
          _this.setData({
            hidden: true,
            canvasShow: false
          });
          _this.init();
        }
      })
    }
  },
  //根据不同天气的背景色设置nav颜色并关闭loading界面
  setNavColor(code){
    if (code >= 9) {
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
      loadingFlag: false
    })
  },
  switch1Change: function (e) {
    // console.log('switch1 发生 change 事件，携带值为', e.detail.value)
    this.setData({
      autoPosition: e.detail.value
    });
  },
  switch2Change: function (e) {
    // console.log('switch2 发生 change 事件，携带值为', e.detail.value)
    this.setData({
      autoPosition: !e.detail.value
    });
  },
  bindRegionChange: function (e) {
    // console.log('picker发送选择改变，携带值为', e.detail.value)
    this.setData({
      region: e.detail.value
    })
  }
});