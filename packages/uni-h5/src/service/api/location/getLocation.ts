import { extend } from '@vue/shared'
import {
  defineAsyncApi,
  API_GET_LOCATION,
  API_TYPE_GET_LOCATION,
  GetLocationProtocol,
  GetLocationOptions,
} from '@dcloudio/uni-api'
import { MapType, getMapInfo } from '../../../helpers/location'
import { getJSONP } from '../../../helpers/getJSONP'
import { request } from '../network/request'

type GeoRes = (coords: GeolocationCoordinates, skip?: boolean) => void

export const getLocation = <API_TYPE_GET_LOCATION>defineAsyncApi(
  API_GET_LOCATION,
  (
    { type, altitude, highAccuracyExpireTime, isHighAccuracy },
    { resolve, reject }
  ) => {
    const mapInfo = getMapInfo()

    new Promise((resolve: GeoRes, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (res) => resolve(res.coords),
          reject,
          {
            enableHighAccuracy: isHighAccuracy || altitude,
            timeout: highAccuracyExpireTime || 1000 * 100,
          }
        )
      } else {
        reject(new Error('device nonsupport geolocation'))
      }
    })
      .catch((error) => {
        return new Promise((resolve: GeoRes, reject) => {
          if (mapInfo.type === MapType.QQ) {
            getJSONP(
              `https://apis.map.qq.com/ws/location/v1/ip?output=jsonp&key=${mapInfo.key}`,
              {
                callback: 'callback',
              },
              (res: any) => {
                if ('result' in res && res.result.location) {
                  const location = res.result.location
                  resolve(
                    {
                      latitude: location.lat,
                      longitude: location.lng,
                    } as GeolocationCoordinates,
                    true
                  )
                } else {
                  reject(new Error(res.message || JSON.stringify(res)))
                }
              },
              () => reject(new Error('network error'))
            )
          } else if (mapInfo.type === MapType.GOOGLE) {
            request({
              method: 'POST',
              url: `https://www.googleapis.com/geolocation/v1/geolocate?key=${mapInfo.key}`,
              success(res) {
                const data: AnyObject = res.data as AnyObject
                if ('location' in data) {
                  resolve({
                    latitude: data.location.lat,
                    longitude: data.location.lng,
                    accuracy: data.accuracy,
                  } as GeolocationCoordinates)
                } else {
                  reject(
                    new Error(
                      (data.error && data.error.message) || JSON.stringify(res)
                    )
                  )
                }
              },
              fail() {
                reject(new Error('network error'))
              },
            })
          } else {
            reject(error)
          }
        })
      })
      .then((coords: GeolocationCoordinates, skip?: boolean) => {
        if (
          (type && type.toUpperCase() === 'WGS84') ||
          mapInfo.type !== MapType.QQ ||
          skip
        ) {
          return coords
        }
        return new Promise((resolve: GeoRes) => {
          getJSONP(
            `https://apis.map.qq.com/jsapi?qt=translate&type=1&points=${coords.longitude},${coords.latitude}&key=${mapInfo.key}&output=jsonp&pf=jsapi&ref=jsapi`,
            {
              callback: 'cb',
            },
            (res: any) => {
              if (
                'detail' in res &&
                'points' in res.detail &&
                res.detail.points.length
              ) {
                const location = res.detail.points[0]
                resolve(
                  extend({}, coords, {
                    longitude: location.lng,
                    latitude: location.lat,
                  })
                )
              } else {
                resolve(coords)
              }
            },
            () => resolve(coords)
          )
        })
      })
      .then((coords: GeolocationCoordinates) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.altitude || 0,
          altitude: coords.altitude || 0,
          verticalAccuracy: coords.altitudeAccuracy || 0,
          // 无专门水平精度，使用位置精度替代
          horizontalAccuracy: coords.accuracy || 0,
        })
      })
      .catch((error) => {
        reject(error.message)
      })
  },
  GetLocationProtocol,
  GetLocationOptions
)
