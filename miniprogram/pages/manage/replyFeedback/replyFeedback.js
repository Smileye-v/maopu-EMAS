// 处理反馈
import { formatDate } from "../../../utils/utils";
import { sendReplyNotice } from "../../../utils/msg";
import { checkAuth, getUserInfo } from "../../../utils/user";
import api from "../../../utils/cloudApi";

const app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    feedback: undefined,
    maxlength: 300,
    length: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    if (checkAuth(this, 1)) {
      await this.reload(options);
    }
  },

  async reload(options) {
    wx.showLoading({
      title: '加载中...',
    });
    var { result } = await app.mpServerless.db.collection('feedback').findOne({
      _id: options.fb_id
    })
    if (!result.userInfo) {
      result.userInfo = (await getUserInfo(result.openid)).userInfo;
    }

    result.openDateStr = formatDate(result.openDate, "yyyy-MM-dd hh:mm:ss");
    this.setData({
      feedback: result
    });
    wx.hideLoading();
  },

  bindInput(e) {
    var inputData = e.detail.value;
    this.setData({
      length: inputData.length
    })
  },

  async bindReply(e) {
    var submitData = e.detail.value;
    if (!submitData.replyInfo) {
      wx.showToast({
        title: '请填写回复后再提交哦',
        icon: 'none'
      })
      return;
    }
    const res = await wx.showModal({
      title: '提示',
      content: '由于微信限制，每条反馈最多只能回复1次，确定回复吗？',
    });

    if (res.confirm) {
      console.log('确认提交回复');
      wx.showLoading({
        title: '正在提交...',
        mask: true
      });
      let res = await sendReplyNotice(this.data.feedback._openid, this.data.feedback._id);
      console.log("[bindReply] - sendReplyNotice res", res);
      const that = this;
      if (res.errCode == 0) {
        // 记录一下回复的内容和时间
        await api.curdOp({
          operation: 'update',
          collection: "feedback",
          item_id: that.data.feedback._id,
          data: {
            replyDate: api.getDate(),
            replyInfo: submitData.replyInfo,
          }
        });
        wx.hideLoading();
        wx.showToast({
          title: '回复成功',
          icon: 'success',
          duration: 1000,
          success: () => {
            setTimeout(wx.navigateBack, 1000)
          }
        })
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '回复失败，这可能是因为对方没有订阅或次数耗尽',
          icon: 'none',
          duration: 1500,
          success: () => {
            setTimeout(wx.navigateBack, 1500)
          }
        });
      }
    }
  }

})

