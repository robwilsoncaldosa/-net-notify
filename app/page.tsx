'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                router.push("/dashboard");
            } else {
                router.push("/login");
            }
        };
        
        checkSession();
    }, [router, supabase.auth]);

    return null;
}