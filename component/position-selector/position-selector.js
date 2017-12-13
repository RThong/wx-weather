Component({
  properties: {
    hidden: Boolean,
    autoPosition: {
      type: Boolean,
      value: true
    },
    region: {
      type: Array,
    }
  },
  data: {
    
  },
  ready(){
    console.log(wx.createSelectorQuery().select('.option'))
  },
  methods: {
    cancel: function () {
      this.setData({
        hidden: true
      });
    },
    confirm: function () {
      this.setData({
        hidden: true
      });
      var myEventDetail = {} // detail对象，提供给事件监听函数
      var myEventOption = {} // 触发事件的选项
      console.log(this);
    },
    switch1Change: function (e) {
      console.log('switch1 发生 change 事件，携带值为', e.detail.value)
      this.setData({
        autoPosition: e.detail.value
      });
    },
    switch2Change: function (e) {
      console.log('switch2 发生 change 事件，携带值为', e.detail.value)
      this.setData({
        autoPosition: !e.detail.value
      });
    },
    bindRegionChange: function (e) {
      console.log('picker发送选择改变，携带值为', e.detail.value)
      this.setData({
        region: e.detail.value
      })
    }
  }
})