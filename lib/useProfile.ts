'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from './supabase/client'
import type {Profile} from './types'

export function useProfile(){
 const supabase=useMemo(()=>createClient(),[])
 const[profile,setProfile]=useState<Profile|null>(null)
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 async function reload(){
  setLoading(true);setError('')
  const{data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user){setProfile(null);setLoading(false);return}
  const{data,error}=await supabase.from('profiles').select('id,email,full_name,role,must_change_password,active').eq('id',user.id).single()
  if(error)setError(error.message)
  setProfile((data||null) as Profile|null);setLoading(false)
 }
 useEffect(()=>{reload()},[])
 return{profile,loading,error,reload,supabase}
}
